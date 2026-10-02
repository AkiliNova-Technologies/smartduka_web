import { Prisma, ProductStatus, VendorStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { createCategorySchema, updateCategorySchema, type CreateCategoryInput, type UpdateCategoryInput } from "@/lib/category-validation";
import { serializeMarketplaceProduct } from "@/services/product";
import { cacheLife, cacheTag } from "next/cache";
import { cacheProfiles, cacheTags } from "@/lib/cache-policy";

export type { CreateCategoryInput, UpdateCategoryInput } from "@/lib/category-validation";
export class CategoryDomainError extends Error {}
export type CategoryTreeNode = { id: string; name: string; slug: string; description: string; image: string; parentId: string | null; isActive: boolean; sortOrder: number; _count: { products: number; subCategories: number }; children: CategoryTreeNode[]; /** Compatibility alias. */ subCategories: CategoryTreeNode[] };
export type HomepageCategory = Pick<CategoryTreeNode, "id" | "name" | "slug" | "image"> & { productCount: number };
type Row = Omit<CategoryTreeNode, "children" | "subCategories">;
type CategoryOptions = { activeOnly?: boolean };

/** Raw category rows used by both public category projections. */
async function getAllCategoriesData(options?: CategoryOptions): Promise<Row[]> {
  const categories = await prisma.productCategory.findMany({ where: options?.activeOnly ? { isActive: true } : undefined, include: { _count: { select: { products: true, children: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", image: c.image ?? "", parentId: c.parentId, isActive: c.isActive, sortOrder: c.sortOrder, _count: { products: c._count.products, subCategories: c._count.children } }));
}

export function buildCategoryTree(rows: Row[]): CategoryTreeNode[] {
  const nodes = new Map(rows.map((row) => [row.id, { ...row, children: [] as CategoryTreeNode[], subCategories: [] as CategoryTreeNode[] }]));
  const roots: CategoryTreeNode[] = [];
  nodes.forEach((node) => { const parent = node.parentId ? nodes.get(node.parentId) : undefined; if (parent) { parent.children.push(node); parent.subCategories.push(node); } else roots.push(node); });
  const sort = (items: CategoryTreeNode[]) => { items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)); items.forEach((item) => { item.subCategories = item.children; sort(item.children); }); };
  sort(roots); return roots;
}
const descendants = (node: CategoryTreeNode): string[] => [node.id, ...node.children.flatMap(descendants)];

export class CategoryService {
  /**
   * Returns at most five populated top-level categories. Products are assigned
   * to their most-specific category once, then rolled up to its root so a
   * product with both category and subcategory never inflates the count.
   */
  static async getHomepageCategories(): Promise<HomepageCategory[]> {
    "use cache";
    cacheLife(cacheProfiles.marketplace);
    cacheTag(cacheTags.marketplace.categories, cacheTags.marketplace.discovery);
    return prisma.$queryRaw<HomepageCategory[]>(Prisma.sql`
      SELECT
        root."id",
        root."name",
        root."slug",
        root."image",
        COUNT(product."id")::integer AS "productCount"
      FROM "Product" AS product
      INNER JOIN "VendorProfile" AS vendor ON vendor."id" = product."vendorId"
      INNER JOIN "ProductCategory" AS leaf
        ON leaf."id" = COALESCE(product."subCategoryId", product."categoryId")
      LEFT JOIN "ProductCategory" AS parent ON parent."id" = leaf."parentId"
      LEFT JOIN "ProductCategory" AS grandparent ON grandparent."id" = parent."parentId"
      INNER JOIN "ProductCategory" AS root
        ON root."id" = COALESCE(grandparent."id", parent."id", leaf."id")
      WHERE product."status" IN (${ProductStatus.ACTIVE}, ${ProductStatus.PUBLISHED})
        AND product."deletedAt" IS NULL
        AND vendor."status" = ${VendorStatus.ACTIVE}
        AND vendor."deletedAt" IS NULL
        AND leaf."isActive" = true
        AND (parent."id" IS NULL OR parent."isActive" = true)
        AND (grandparent."id" IS NULL OR grandparent."isActive" = true)
        AND root."isActive" = true
      GROUP BY root."id", root."name", root."slug", root."image", root."sortOrder"
      ORDER BY root."sortOrder" ASC, COUNT(product."id") DESC, root."name" ASC
      LIMIT 5
    `);
  }

  static async getAllCategories(options?: CategoryOptions): Promise<Row[]> {
    return getAllCategoriesData(options);
  }
  static async getCategoryTree(options?: CategoryOptions) {
    "use cache";
    cacheLife(cacheProfiles.marketplace);
    cacheTag(cacheTags.marketplace.categories);
    const rows = await getAllCategoriesData(options); if (!options?.activeOnly) return buildCategoryTree(rows);
    const byId = new Map(rows.map((row) => [row.id, row]));
    return buildCategoryTree(rows.filter((row) => { let cursor: Row | undefined = row; while (cursor) { if (!cursor.isActive) return false; cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined; } return true; }));
  }
  private static async assertParent(id: string | undefined, parentId: string | null | undefined) {
    if (!parentId) return; if (id === parentId) throw new CategoryDomainError("A category cannot be its own parent.");
    let cursor = await prisma.productCategory.findUnique({ where: { id: parentId }, select: { id: true, parentId: true, isActive: true } });
    if (!cursor) throw new CategoryDomainError("The selected parent category does not exist."); if (!cursor.isActive) throw new CategoryDomainError("An inactive category cannot be used as a parent.");
    let depth = 1; while (cursor) { if (cursor.id === id) throw new CategoryDomainError("This move would create a category cycle."); cursor = cursor.parentId ? await prisma.productCategory.findUnique({ where: { id: cursor.parentId }, select: { id: true, parentId: true, isActive: true } }) : null; if (++depth > 3) throw new CategoryDomainError("Categories may be nested no deeper than three levels."); }
  }
  private static async assertSlug(slug: string, id?: string) { const existing = await prisma.productCategory.findUnique({ where: { slug }, select: { id: true } }); if (existing && existing.id !== id) throw new CategoryDomainError("That category slug is already in use."); }
  static async createCategory(input: CreateCategoryInput) {
    const data = createCategorySchema.parse(input); await this.assertParent(undefined, data.parentId); await this.assertSlug(data.slug); if (data.parentId && data.subCategories.length) throw new CategoryDomainError("Create descendants with the explicit child action.");
    return prisma.$transaction(async (tx) => { const parent = await tx.productCategory.create({ data: { name: data.name, slug: data.slug, description: data.description || null, image: data.image || null, parentId: data.parentId ?? null, sortOrder: data.sortOrder } }); for (const child of data.subCategories) { const collision = await tx.productCategory.findUnique({ where: { slug: child.slug }, select: { id: true } }); if (collision) throw new CategoryDomainError("That category slug is already in use."); await tx.productCategory.create({ data: { name: child.name, slug: child.slug, description: child.description || null, image: child.image || null, parentId: parent.id, sortOrder: child.sortOrder } }); } return parent; });
  }
  static createCategoryWithSubs(input: CreateCategoryInput) { return this.createCategory(input); }
  static async updateCategory(input: UpdateCategoryInput) { const data = updateCategorySchema.parse(input); await this.assertParent(data.id, data.parentId); await this.assertSlug(data.slug, data.id); if (data.isActive === false && await prisma.productCategory.count({ where: { parentId: data.id, isActive: true } })) throw new CategoryDomainError("Deactivate or reparent active child categories first."); return prisma.productCategory.update({ where: { id: data.id }, data: { name: data.name, slug: data.slug, description: data.description || null, image: data.image || null, sortOrder: data.sortOrder, ...(data.parentId !== undefined ? { parentId: data.parentId } : {}), ...(data.isActive !== undefined ? { isActive: data.isActive } : {}) } }); }
  static async moveCategory(id: string, parentId: string | null) { await this.assertParent(id, parentId); return prisma.productCategory.update({ where: { id }, data: { parentId } }); }
  static async setCategoryStatus(id: string, isActive: boolean) { const category = await prisma.productCategory.findUnique({ where: { id }, select: { parentId: true } }); if (!category) throw new CategoryDomainError("Category not found."); if (!isActive && await prisma.productCategory.count({ where: { parentId: id, isActive: true } })) throw new CategoryDomainError("Deactivate or reparent active child categories first."); if (isActive) await this.assertParent(id, category.parentId); return prisma.productCategory.update({ where: { id }, data: { isActive } }); }
  static async deleteCategory(id: string) { const category = await prisma.productCategory.findUnique({ where: { id }, select: { _count: { select: { children: true, products: true, subProducts: true } } } }); if (!category) throw new CategoryDomainError("Category not found."); if (category._count.children) throw new CategoryDomainError("This category cannot be deleted while it has child categories."); if (category._count.products || category._count.subProducts) throw new CategoryDomainError("This category cannot be deleted while products reference it."); return prisma.productCategory.delete({ where: { id } }); }
  static async getCategoryById(id: string) { return prisma.productCategory.findUnique({ where: { id }, include: { parent: true, children: true, _count: { select: { products: true, children: true } } } }); }
  static async getCategoryBySlug(slug: string) { const flatten = (nodes: CategoryTreeNode[]): CategoryTreeNode[] => nodes.flatMap((node) => [node, ...flatten(node.children)]); return flatten(await this.getCategoryTree({ activeOnly: true })).find((node) => node.slug === slug) ?? null; }
  static async getProductsByCategorySlug(slug: string, options?: { sort?: string; limit?: number }) { const category = await this.getCategoryBySlug(slug); if (!category) return []; const ids = descendants(category); const categorySelect = { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true } } } } } as const; const products = await prisma.product.findMany({ where: { OR: [{ categoryId: { in: ids } }, { subCategoryId: { in: ids } }], status: { in: ["ACTIVE", "PUBLISHED"] }, deletedAt: null }, include: { images: { take: 1, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }] }, variants: { select: { isActive: true, inventoryCount: true, price: true } }, category: { select: categorySelect }, subCategory: { select: categorySelect }, vendor: { select: { id: true, storeName: true, slug: true } }, reviews: { where: { status: "PUBLISHED" }, select: { rating: true } } }, orderBy: options?.sort === "low-high" ? { basePrice: "asc" } : options?.sort === "high-low" ? { basePrice: "desc" } : { createdAt: "desc" }, take: options?.limit || 50 }); return products.map((product) => serializeMarketplaceProduct(product as unknown as Record<string, unknown>)); }
  static async assertCompatibleProductCategories(categoryId?: string | null, subCategoryId?: string | null) { const ids = [categoryId, subCategoryId].filter((id): id is string => Boolean(id)); if (!ids.length) return; const categories = await prisma.productCategory.findMany({ where: { id: { in: ids } }, select: { id: true, parentId: true, isActive: true } }); const main = categories.find((c) => c.id === categoryId), sub = categories.find((c) => c.id === subCategoryId); if ((categoryId && (!main || !main.isActive)) || (subCategoryId && (!sub || !sub.isActive))) throw new CategoryDomainError("Select an active approved category."); if (main && sub && sub.parentId !== main.id) throw new CategoryDomainError("The selected subcategory does not belong to the selected category."); }
}
