import { prisma } from "@/lib/prisma/client";
import { ProductService } from "@/services/product";

const detailSelect = {
  id: true, name: true, slug: true, brand: true, description: true, basePrice: true,
  compareAtPrice: true, categoryId: true, subCategoryId: true, inventoryCount: true,
  sku: true, status: true, sizes: true, colors: true, specs: true, tags: true,
  images: { select: { id: true, url: true, isFeatured: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
  variants: { select: { id: true, sku: true, name: true, price: true, inventoryCount: true, options: true, isActive: true } },
} as const;

/** Mobile-safe vendor catalogue projection. Tenant identity is supplied by the server context. */
export class VendorMobileCatalogService {
  /** Deliberate allow-list for mutation responses; never serialize tenant or audit fields. */
  static mutationDto(product: Record<string, unknown>) {
    const fields = ["id", "name", "slug", "brand", "description", "basePrice", "compareAtPrice", "categoryId", "subCategoryId", "inventoryCount", "sku", "status", "sizes", "colors", "specs", "tags", "createdAt", "updatedAt"] as const;
    return Object.fromEntries(fields.filter((field) => field in product).map((field) => [field, product[field]]));
  }

  static async list(vendorId: string, input: { search?: string; categoryId?: string; page: number; pageSize: number }) {
    const where = {
      vendorId, deletedAt: null,
      ...(input.search ? { OR: [{ name: { contains: input.search, mode: "insensitive" as const } }, { slug: { contains: input.search, mode: "insensitive" as const } }] } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    };
    const [data, total] = await Promise.all([
      ProductService.getVendorProducts(vendorId, { search: input.search, categoryId: input.categoryId, limit: input.pageSize, offset: (input.page - 1) * input.pageSize }),
      prisma.product.count({ where }),
    ]);
    return { data, total };
  }

  static async detail(vendorId: string, id: string) {
    const product = await prisma.product.findFirst({ where: { id, vendorId }, select: detailSelect });
    if (!product) return null;
    return {
      ...product,
      basePrice: Number(product.basePrice),
      compareAtPrice: product.compareAtPrice === null ? null : Number(product.compareAtPrice),
      variants: product.variants.map((variant) => ({ ...variant, price: Number(variant.price) })),
    };
  }

  static async exists(vendorId: string, id: string) {
    return Boolean(await prisma.product.findFirst({ where: { id, vendorId }, select: { id: true } }));
  }
}
