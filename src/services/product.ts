import { prisma } from "@/lib/prisma/client";
import { Prisma, ProductStatus } from "@prisma/client";
import { CategoryService } from "@/services/category";
import { validateVariants, type VariantInput } from "@/lib/variant-validation";
import { createVariantWithSku, generateVariantSku, isSkuCollision } from "@/lib/variant-sku";
import { randomUUID } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { cacheProfiles, cacheTags } from "@/lib/cache-policy";

// ==========================================
// INPUT TYPES
// ==========================================

export interface CreateProductInput {
  vendorId: string;
  name: string;
  slug: string;
  brand?: string;
  description?: string;
  basePrice: number;
  compareAtPrice?: number;
  categoryId?: string;
  subCategoryId?: string;
  inventoryCount?: number;
  sku?: string;
  status?: "DRAFT" | "PUBLISHED";
  sizes?: string[];
  colors?: string[];
  specs?: Record<string, string>[];
  tags?: string[];
  images?: { url: string; isFeatured?: boolean; sortOrder?: number }[];
  variants?: VariantInput[];
}

export interface UpdateProductInput {
  id: string;
  name?: string;
  slug?: string;
  brand?: string;
  description?: string;
  basePrice?: number;
  compareAtPrice?: number | null;
  categoryId?: string | null;
  subCategoryId?: string | null;
  inventoryCount?: number;
  sku?: string;
  status?: "DRAFT" | "PUBLISHED" | "ACTIVE" | "ARCHIVED" | "OUT_OF_STOCK";
  sizes?: string[];
  colors?: string[];
  specs?: Record<string, string>[];
  tags?: string[];
  variants?: VariantInput[];
}

export interface ProductQueryOptions {
  vendorId?: string;
  categoryId?: string;
  status?: ProductStatus | ProductStatus[];
  search?: string;
  limit?: number;
  offset?: number;
}

export type CatalogSort = "newest" | "price-asc" | "price-desc";
export type CatalogFilters = { categoryId?: string; minPrice?: number; maxPrice?: number; inStock?: boolean; brand?: string; sizes?: string[]; colors?: string[]; page?: number };

type RelatedCategory = { id: string; parentId: string | null };
type RelatedCandidate = { id: string; inventoryCount: number; isPurchasable: boolean };

/**
 * Builds the category scopes used by related-product discovery.  Product
 * category assignments can point at any level in the category tree, so the
 * deepest assigned category—not the legacy `categoryId` field alone—is the
 * starting point.
 */
export function getRelatedCategoryScopes(
  assignedCategoryIds: Array<string | null | undefined>,
  categories: RelatedCategory[],
) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const ancestry = (id: string) => {
    const path: string[] = [];
    const seen = new Set<string>();
    let cursor = byId.get(id);
    while (cursor && !seen.has(cursor.id)) {
      path.push(cursor.id);
      seen.add(cursor.id);
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
    return path;
  };
  const assigned = [...new Set(assignedCategoryIds.filter((id): id is string => Boolean(id)))];
  const leaf = assigned
    .map((id) => ({ id, path: ancestry(id) }))
    .filter(({ path }) => path.length > 0)
    .sort((a, b) => b.path.length - a.path.length || a.id.localeCompare(b.id))[0];

  if (!leaf) return null;

  const parentId = byId.get(leaf.id)?.parentId ?? null;
  const siblingIds = parentId
    ? categories
        .filter((category) => category.parentId === parentId && category.id !== leaf.id)
        .map((category) => category.id)
        .sort()
    : [];
  const mainCategoryId = leaf.path.at(-1)!;
  const mainCategoryIds = categories
    .filter((category) => ancestry(category.id).includes(mainCategoryId))
    .map((category) => category.id)
    .sort();

  return { leafCategoryId: leaf.id, siblingIds, mainCategoryIds };
}

/** Keeps category priority, prefers purchasable stock, and removes duplicates. */
export function selectRelatedCandidates<T extends RelatedCandidate>(
  groups: T[][],
  limit: number,
) {
  const selected: T[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    const preferred = group
      .map((candidate, index) => ({ candidate, index }))
      .sort(
        (a, b) =>
          Number(b.candidate.isPurchasable) - Number(a.candidate.isPurchasable) ||
          Number(b.candidate.inventoryCount > 0) - Number(a.candidate.inventoryCount > 0) ||
          a.index - b.index,
      );
    for (const { candidate } of preferred) {
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      selected.push(candidate);
      if (selected.length === limit) return selected;
    }
  }
  return selected;
}

// ==========================================
// SERIALIZATION HELPERS
// ==========================================

/**
 * Converts a Prisma product (with Decimal fields) to a safe plain object
 */
export function serializeProductBasic(product: Record<string, unknown>): Record<string, unknown> {
  const variants = Array.isArray(product.variants)
    ? product.variants as Array<Record<string, unknown> & { isActive?: boolean; inventoryCount?: number; price?: unknown }>
    : [];
  const eligibleVariants = variants.filter((variant) => variant.isActive !== false && (variant.inventoryCount ?? 0) > 0);
  const minimumVariantPrice = eligibleVariants.length
    ? Math.min(...eligibleVariants.map((variant) => Number(variant.price)))
    : null;
  const hasVariants = variants.length > 0;
  return {
    ...product,
    basePrice: minimumVariantPrice ?? (product.basePrice != null ? Number(product.basePrice) : 0),
    compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
    inventoryCount: hasVariants ? eligibleVariants.reduce((total, variant) => total + (variant.inventoryCount ?? 0), 0) : product.inventoryCount,
    priceFrom: hasVariants && new Set(eligibleVariants.map((variant) => Number(variant.price))).size > 1,
    requiresVariantSelection: hasVariants,
    isPurchasable: hasVariants ? minimumVariantPrice !== null : (Number(product.inventoryCount) > 0),
    // Prisma Decimal instances cannot cross the server/client boundary. Keep the
    // data shape, but make every value rendered by vendor and marketplace clients
    // a plain value at the shared catalogue boundary.
    variants: variants.map((variant) => ({
      ...variant,
      price: Number(variant.price),
      createdAt: variant.createdAt instanceof Date ? variant.createdAt.toISOString() : variant.createdAt,
      updatedAt: variant.updatedAt instanceof Date ? variant.updatedAt.toISOString() : variant.updatedAt,
    })),
    images: Array.isArray(product.images)
      ? (product.images as Array<Record<string, unknown>>).map((image) => ({ ...image }))
      : product.images,
    createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt,
    updatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : product.updatedAt,
  };
}

/** The single stock projection used by marketplace cards and discovery feeds. */
type MarketplaceCategory = {
  id: string;
  name: string;
  slug: string;
  parent?: MarketplaceCategory | null;
};

const marketplaceCategorySelect = {
  id: true,
  name: true,
  slug: true,
  parent: {
    select: {
      id: true,
      name: true,
      slug: true,
      parent: { select: { id: true, name: true, slug: true } },
    },
  },
} as const;

function resolveMarketplaceCategory(product: Record<string, unknown>) {
  const assigned = (product.subCategory ?? product.category) as MarketplaceCategory | null | undefined;
  const root = product.category as MarketplaceCategory | null | undefined;
  if (!assigned) return { category: root ?? null, subCategory: null, categoryName: root?.name ?? null, subCategoryName: null, mostSpecificCategory: root ?? null, categoryPath: root ? [root] : [] };
  const path: MarketplaceCategory[] = [];
  for (let current: MarketplaceCategory | null | undefined = assigned; current; current = current.parent) {
    if (!path.some((item) => item.id === current.id)) path.unshift(current);
  }
  if (root && !path.some((item) => item.id === root.id)) path.unshift(root);
  const mostSpecificCategory = path.at(-1) ?? assigned;
  const isRootCategory = mostSpecificCategory.id === path[0]?.id;
  return { category: path[0] ?? root ?? null, subCategory: isRootCategory ? null : mostSpecificCategory, categoryName: path[0]?.name ?? null, subCategoryName: isRootCategory ? null : mostSpecificCategory.name, mostSpecificCategory, categoryPath: path };
}

export function serializeMarketplaceProduct(product: Record<string, unknown>) {
  const variants = Array.isArray(product.variants)
    ? product.variants as Array<{ isActive?: boolean; inventoryCount?: number; price?: unknown }>
    : [];
  const hasVariants = variants.length > 0;
  const eligibleVariants = variants.filter((variant) => variant.isActive !== false && (variant.inventoryCount ?? 0) > 0);
  const availableInventory = hasVariants
    ? eligibleVariants.reduce((total, variant) => total + (variant.inventoryCount ?? 0), 0)
    : Number(product.inventoryCount ?? 0);
  const prices = eligibleVariants.map((variant) => Number(variant.price));
  const vendor = product.vendor as { storeName?: string } | null | undefined;
  const images = Array.isArray(product.images) ? product.images as Array<{ url?: string }> : [];
  const publishedReviews = Array.isArray(product.reviews) ? product.reviews as Array<{ rating: number }> : [];
  const categoryHierarchy = resolveMarketplaceCategory(product);
  return {
    id: product.id as string,
    name: product.name as string,
    slug: product.slug as string,
    brand: product.brand as string | null,
    basePrice: prices.length ? Math.min(...prices) : Number(product.basePrice),
    compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
    inventoryCount: availableInventory,
    priceFrom: hasVariants && new Set(prices).size > 1,
    requiresVariantSelection: hasVariants,
    isPurchasable: availableInventory > 0,
    image: images[0]?.url || "",
    vendorId: product.vendorId as string,
    vendorName: vendor?.storeName || "Unknown Store",
    rating: publishedReviews.length ? Number((publishedReviews.reduce((sum, review) => sum + review.rating, 0) / publishedReviews.length).toFixed(1)) : 0,
    reviews: publishedReviews.length,
    // This is intentionally a plain projection. Some catalogue consumers need
    // variant options, but Prisma Decimal instances must never leave this layer.
    variants: variants.map((variant) => ({
      isActive: variant.isActive !== false,
      inventoryCount: Number(variant.inventoryCount ?? 0),
      price: Number(variant.price ?? 0),
      options: (variant as { options?: unknown }).options as Record<string, string> | undefined,
    })),
    ...categoryHierarchy,
    createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt as string | undefined,
  };
}

export interface SerializedPublicProduct {
  id: string; name: string; slug: string; brand: string | null; description: string;
  basePrice: number; compareAtPrice: number | null; inventoryCount: number; sku: string | null;
  status: string; sizes: string[]; colors: string[]; specs: { name: string; value: string }[];
  tags: string[]; images: { id: string; url: string; isFeatured: boolean }[];
  category: { id: string; name: string; slug: string } | null;
  subCategory: { id: string; name: string; slug: string } | null;
  vendor: { id: string; storeName: string; slug: string; logoUrl: string | null; isVerified: boolean; fulfillmentMethods: ("DELIVERY" | "PICKUP")[]; deliveryFee: number | null; deliveryEstimate: string | null; pickupLocation: string | null; returnWindowDays: number | null; returnPolicy: string | null; returnInstructions: string | null; acceptsExchanges: boolean; exchangePolicy: string | null } | null;
  rating: number; reviewCount: number;
  reviews: { id: string; user: string; avatarUrl: string | null; rating: number; date: string; comment: string; verifiedPurchase: boolean; title: string | null; imageUrls: string[]; variantName: string | null; vendorReply: string | null }[];
  availability: string; createdAt: string; variants: { id: string; sku: string; name: string; price: number; inventoryCount: number; options: Record<string, string>; isActive: boolean }[]; hasVariants: boolean;
}

/** Explicit public DTO for product detail cache and Client Component boundaries. */
export function serializePublicProductDetail(product: Record<string, unknown>): SerializedPublicProduct {
  const variants = Array.isArray(product.variants) ? product.variants as Array<Record<string, unknown>> : [];
  const reviews = Array.isArray(product.reviews) ? product.reviews as Array<Record<string, unknown>> : [];
  const activeVariants = variants.filter((variant) => variant.isActive === true);
  const eligibleVariants = activeVariants.filter((variant) => Number(variant.inventoryCount ?? 0) > 0);
  const hasVariants = variants.length > 0;
  const inventoryCount = hasVariants
    ? eligibleVariants.reduce((total, variant) => total + Number(variant.inventoryCount ?? 0), 0)
    : Number(product.inventoryCount ?? 0);
  const relation = (value: unknown) => value && typeof value === "object" ? value as Record<string, unknown> : null;
  const category = relation(product.category), subCategory = relation(product.subCategory), vendor = relation(product.vendor);
  return {
    id: String(product.id), name: String(product.name), slug: String(product.slug), brand: typeof product.brand === "string" ? product.brand : null,
    description: typeof product.description === "string" ? product.description : "", basePrice: Number(product.basePrice ?? 0), compareAtPrice: product.compareAtPrice == null ? null : Number(product.compareAtPrice),
    inventoryCount, sku: typeof product.sku === "string" ? product.sku : null, status: String(product.status),
    sizes: Array.isArray(product.sizes) ? product.sizes.filter((value): value is string => typeof value === "string") : [],
    colors: Array.isArray(product.colors) ? product.colors.filter((value): value is string => typeof value === "string") : [],
    specs: Array.isArray(product.specs) ? product.specs.filter((value): value is { name: string; value: string } => Boolean(value && typeof value === "object" && typeof (value as { name?: unknown }).name === "string" && typeof (value as { value?: unknown }).value === "string")) : [],
    tags: Array.isArray(product.tags) ? product.tags.filter((value): value is string => typeof value === "string") : [],
    images: (Array.isArray(product.images) ? product.images : []).map((image) => { const value = image as Record<string, unknown>; return { id: String(value.id), url: String(value.url), isFeatured: value.isFeatured === true }; }),
    category: category ? { id: String(category.id), name: String(category.name), slug: String(category.slug) } : null,
    subCategory: subCategory ? { id: String(subCategory.id), name: String(subCategory.name), slug: String(subCategory.slug) } : null,
    vendor: vendor ? { id: String(vendor.id), storeName: String(vendor.storeName), slug: String(vendor.slug), logoUrl: typeof vendor.logoUrl === "string" ? vendor.logoUrl : null, isVerified: vendor.isVerified === true, fulfillmentMethods: Array.isArray(vendor.fulfillmentMethods) ? vendor.fulfillmentMethods.filter((method): method is "DELIVERY" | "PICKUP" => method === "DELIVERY" || method === "PICKUP") : [], deliveryFee: vendor.deliveryFee == null ? null : Number(vendor.deliveryFee), deliveryEstimate: typeof vendor.deliveryEstimate === "string" ? vendor.deliveryEstimate : null, pickupLocation: typeof vendor.pickupLocation === "string" ? vendor.pickupLocation : null, returnWindowDays: typeof vendor.returnWindowDays === "number" ? vendor.returnWindowDays : null, returnPolicy: typeof vendor.returnPolicy === "string" ? vendor.returnPolicy : null, returnInstructions: typeof vendor.returnInstructions === "string" ? vendor.returnInstructions : null, acceptsExchanges: vendor.acceptsExchanges === true, exchangePolicy: typeof vendor.exchangePolicy === "string" ? vendor.exchangePolicy : null } : null,
    rating: reviews.length ? Number((reviews.reduce((sum, review) => sum + Number(review.rating ?? 0), 0) / reviews.length).toFixed(1)) : 0,
    reviewCount: Number((product._count as { reviews?: number } | undefined)?.reviews ?? reviews.length),
    reviews: reviews.map((review) => { const user = relation(review.user); const variant = relation(review.variant); const replies = Array.isArray(review.vendorReplies) ? review.vendorReplies as Array<Record<string, unknown>> : []; const createdAt = review.createdAt; return { id: String(review.id), user: typeof user?.name === "string" ? user.name : "Anonymous", avatarUrl: typeof user?.avatarUrl === "string" ? user.avatarUrl : null, rating: Number(review.rating ?? 0), date: createdAt instanceof Date ? createdAt.toISOString().split("T")[0] : typeof createdAt === "string" ? createdAt.split("T")[0] : "", comment: typeof review.comment === "string" ? review.comment : "", verifiedPurchase: review.verifiedPurchase === true, title: typeof review.title === "string" ? review.title : null, imageUrls: Array.isArray(review.imageUrls) ? review.imageUrls.filter((url): url is string => typeof url === "string") : [], variantName: typeof variant?.name === "string" ? variant.name : null, vendorReply: typeof replies[0]?.body === "string" ? replies[0].body : null }; }),
    availability: inventoryCount > 0 ? "In Stock - Dispatch Available via Boda Riders" : "Out of Stock",
    createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : typeof product.createdAt === "string" ? product.createdAt : "",
    hasVariants,
    variants: activeVariants.map((variant) => ({ id: String(variant.id), sku: String(variant.sku ?? ""), name: String(variant.name), price: Number(variant.price ?? 0), inventoryCount: Number(variant.inventoryCount ?? 0), options: relation(variant.options) as Record<string, string> ?? {}, isActive: true })),
  };
}

// ==========================================
// PRODUCT SERVICE
// ==========================================

export class ProductService {
  // ==========================================
  // READ OPERATIONS
  // ==========================================

  /**
   * Get all products with relations
   */
  static async getAllProducts(options?: ProductQueryOptions) {
    const where: Prisma.ProductWhereInput = {};

    if (options?.vendorId) where.vendorId = options.vendorId;
    if (options?.categoryId) where.categoryId = options.categoryId;
    if (options?.status) {
      where.status = Array.isArray(options.status)
        ? { in: options.status }
        : options.status;
    }
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: "insensitive" } },
        { brand: { contains: options.search, mode: "insensitive" } },
        { description: { contains: options.search, mode: "insensitive" } },
      ];
    }

    return prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
        subCategory: true,
        variants: true,
        vendor: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            logoUrl: true,
            isVerified: true,
            fulfillmentMethods: true,
            deliveryFee: true,
            deliveryEstimate: true,
            pickupLocation: true,
            returnWindowDays: true,
            returnPolicy: true,
            returnInstructions: true,
            acceptsExchanges: true,
            exchangePolicy: true,
          },
        },
        _count: { select: { reviews: true, variants: true } },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /** Public marketplace catalogue. This intentionally excludes drafts, archived
   * products, and soft-deleted records before any search or sort is applied. */
  static async getPublicCatalogProducts(options?: {
    search?: string;
    sort?: CatalogSort;
    limit?: number;
  } & CatalogFilters) {
    "use cache";
    cacheLife(cacheProfiles.marketplace);
    cacheTag(cacheTags.marketplace.products);
    const search = options?.search?.trim();
    const where: Prisma.ProductWhereInput = {
      status: { in: ["ACTIVE", "PUBLISHED"] },
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } },
        { vendor: { storeName: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (options?.brand) where.brand = { equals: options.brand, mode: "insensitive" };
    if (options?.categoryId) {
      const tree = await CategoryService.getCategoryTree({ activeOnly: true });
      const flatten = (nodes: typeof tree): typeof tree => nodes.flatMap((node) => [node, ...flatten(node.children)]);
      const selected = flatten(tree).find((category) => category.id === options.categoryId);
      if (!selected) return [];
      const ids = [selected.id, ...flatten(selected.children).map((category) => category.id)];
      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { OR: [{ categoryId: { in: ids } }, { subCategoryId: { in: ids } }] }];
    }
    const price = { ...(options?.minPrice !== undefined ? { gte: options.minPrice } : {}), ...(options?.maxPrice !== undefined ? { lte: options.maxPrice } : {}) };
    if (Object.keys(price).length) where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { OR: [{ variants: { none: {} }, basePrice: price }, { variants: { some: { isActive: true, inventoryCount: { gt: 0 }, price } } }] }];
    if (options?.inStock) where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { OR: [{ variants: { none: {} }, inventoryCount: { gt: 0 } }, { variants: { some: { isActive: true, inventoryCount: { gt: 0 } } } }] }];
    if (options?.sizes?.length || options?.colors?.length) {
      const optionFilter = (names: string[], values: string[]) => ({ OR: names.flatMap((name) => values.map((value) => ({ options: { path: [name], equals: value } }))) } as unknown as Prisma.ProductVariantWhereInput);
      const variantAnd = [...(options.sizes?.length ? [optionFilter(["Size", "size"], options.sizes)] : []), ...(options.colors?.length ? [optionFilter(["Colour", "Color", "colour", "color"], options.colors)] : [])];
      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { variants: { some: { isActive: true, inventoryCount: { gt: 0 }, AND: variantAnd } } }];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      options?.sort === "price-asc"
        ? { basePrice: "asc" }
        : options?.sort === "price-desc"
          ? { basePrice: "desc" }
          : { createdAt: "desc" };

    const products = await prisma.product.findMany({
      where,
      include: {
        images: { take: 1, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }] },
        variants: { select: { isActive: true, inventoryCount: true, price: true, options: true } },
        category: { select: marketplaceCategorySelect },
        subCategory: { select: marketplaceCategorySelect },
        vendor: { select: { id: true, storeName: true, slug: true, logoUrl: true } },
        reviews: { where: { status: "PUBLISHED" }, select: { rating: true } },
      },
      orderBy,
      take: options?.limit || 50,
      skip: Math.max(0, ((options?.page ?? 1) - 1) * (options?.limit || 50)),
    });
    return products.map((product) => serializeMarketplaceProduct(product as unknown as Record<string, unknown>));
  }

  static async getPublicCatalogBrands() {
    "use cache";
    cacheLife(cacheProfiles.marketplace);
    cacheTag(cacheTags.marketplace.products);
    const brands = await prisma.product.findMany({ where: { status: { in: ["ACTIVE", "PUBLISHED"] }, deletedAt: null, brand: { not: null } }, distinct: ["brand"], select: { brand: true }, orderBy: { brand: "asc" }, take: 50 });
    return brands.flatMap((item) => item.brand?.trim() ? [item.brand.trim()] : []);
  }

  static async getPublicCatalogVariantFacets(options?: Pick<CatalogFilters, "categoryId" | "brand" | "inStock">) {
    "use cache";
    cacheLife(cacheProfiles.marketplace);
    cacheTag(cacheTags.marketplace.products, cacheTags.marketplace.categories);
    const products = await ProductService.getPublicCatalogProducts({ ...options, limit: 500 });
    const sizes = new Set<string>(), colors = new Set<string>();
    for (const product of products) for (const variant of product.variants) {
      if (!variant.isActive || variant.inventoryCount <= 0) continue;
      for (const [name, value] of Object.entries(variant.options as Record<string, unknown>)) {
        if (typeof value !== "string") continue;
        if (name === "Size" || name === "size") sizes.add(value);
        if (["Colour", "Color", "colour", "color"].includes(name)) colors.add(value);
      }
    }
    return { sizes: [...sizes].sort(), colors: [...colors].sort() };
  }

  /** Get a public product by ID (only active/published, non-deleted). */
  static async getPublicProductById(id: string) {
    return prisma.product.findFirst({
      where: { id, status: { in: ["ACTIVE", "PUBLISHED"] }, deletedAt: null },
      include: {
        images: { orderBy: { sortOrder: "asc" } }, category: true, subCategory: true,
        vendor: { select: { id: true, storeName: true, slug: true, logoUrl: true, isVerified: true } },
        variants: true, reviews: { where: { status: "PUBLISHED" }, include: { user: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: { createdAt: "desc" } },
        _count: { select: { reviews: { where: { status: "PUBLISHED" } }, variants: true, orderItems: true } },
      },
    });
  }

  /**
   * Get a single product by ID
   */
  static async getProductById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
        subCategory: true,
        variants: true,
        vendor: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            logoUrl: true,
            status: true,
            isVerified: true,
          },
        },
        reviews: {
          where: { status: "PUBLISHED" },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
            variant: { select: { name: true } },
            vendorReplies: { select: { body: true, createdAt: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { reviews: { where: { status: "PUBLISHED" } }, variants: true, orderItems: true } },
      },
    });
  }

  /**
   * Get product by slug
   */
  static async getProductBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
        subCategory: true,
        vendor: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            logoUrl: true,
            isVerified: true,
          },
        },
        variants: true,
        reviews: {
          where: { status: "PUBLISHED" },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
            variant: { select: { name: true } },
            vendorReplies: { select: { body: true, createdAt: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { reviews: { where: { status: "PUBLISHED" } } } },
      },
    });
  }

  /**
   * Get public product by slug (only active/published, non-deleted)
   */
  static async getPublicProductBySlug(slug: string) {
    return prisma.product.findFirst({
      where: {
        slug,
        status: { in: ["ACTIVE", "PUBLISHED"] },
        deletedAt: null,
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
        subCategory: true,
        vendor: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            logoUrl: true,
            isVerified: true,
            fulfillmentMethods: true,
            deliveryFee: true,
            deliveryEstimate: true,
            pickupLocation: true,
            returnWindowDays: true,
            returnPolicy: true,
            returnInstructions: true,
            acceptsExchanges: true,
            exchangePolicy: true,
          },
        },
        reviews: {
          where: { status: "PUBLISHED" },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
            variant: { select: { name: true } },
            vendorReplies: { select: { body: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { reviews: { where: { status: "PUBLISHED" } } } },
        variants: true,
      },
    });
  }

  /** Shared, slug-keyed public detail read. Its output is deliberately DTO-only. */
  static async getCachedPublicProductDetailBySlug(slug: string) {
    "use cache";
    cacheLife(cacheProfiles.marketplace);
    cacheTag(cacheTags.marketplace.products, cacheTags.marketplace.discovery, cacheTags.productSlug(slug));
    const product = await ProductService.getPublicProductBySlug(slug);
    if (!product) return null;
    cacheTag(cacheTags.product(product.id));
    const [relatedProducts] = await Promise.all([ProductService.getRelatedProducts(product, 4)]);
    return { product: serializePublicProductDetail(product as unknown as Record<string, unknown>), relatedProducts };
  }

  /**
   * Get vendor's products
   */
  static async getVendorProducts(
    vendorId: string,
    options?: Omit<ProductQueryOptions, "vendorId">
  ) {
    return this.getAllProducts({ vendorId, ...options });
  }

  /**
   * Get new arrivals — products created within the last 14 days
   */
  static async getNewArrivals(limit = 20) {
    "use cache";
    cacheLife(cacheProfiles.marketplace);
    cacheTag(cacheTags.marketplace.products, cacheTags.marketplace.discovery);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const products = await prisma.product.findMany({
      where: {
        status: { in: ["ACTIVE", "PUBLISHED"] },
        deletedAt: null,
        createdAt: { gte: fourteenDaysAgo },
      },
      include: {
        images: { take: 1, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }] },
        vendor: { select: { id: true, storeName: true, slug: true } },
        category: { select: marketplaceCategorySelect },
        subCategory: { select: marketplaceCategorySelect },
        variants: { select: { isActive: true, inventoryCount: true, price: true } }, reviews: { where: { status: "PUBLISHED" }, select: { rating: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return products.map((product) => ({ ...serializeMarketplaceProduct(product as unknown as Record<string, unknown>), isNewArrival: true }));
  }

  /**
   * Get deals — products with active discounts (compareAtPrice > basePrice)
   */
  static async getDeals(limit = 20) {
    "use cache";
    cacheLife(cacheProfiles.marketplace);
    cacheTag(cacheTags.marketplace.products, cacheTags.marketplace.discovery);
    const products = await prisma.product.findMany({
      where: {
        status: { in: ["ACTIVE", "PUBLISHED"] },
        deletedAt: null,
        compareAtPrice: { not: null },
      },
      include: {
        images: { take: 1, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }] },
        vendor: { select: { id: true, storeName: true, slug: true } },
        category: { select: marketplaceCategorySelect },
        subCategory: { select: marketplaceCategorySelect },
        variants: { select: { isActive: true, inventoryCount: true, price: true } }, reviews: { where: { status: "PUBLISHED" }, select: { rating: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return products
      .filter(
        (p) =>
          p.compareAtPrice &&
          Number(p.compareAtPrice) > Number(p.basePrice)
      )
      .map((p) => ({
        ...serializeMarketplaceProduct(p as unknown as Record<string, unknown>),
        discountPercentage: Math.round(
          ((Number(p.compareAtPrice) - Number(p.basePrice)) /
            Number(p.compareAtPrice)) *
            100
        ),
      }));
  }

  /**
   * Public, category-aware recommendations. Results stay in the shared
   * marketplace-card contract, so every catalogue surface uses the same stock,
   * price, image, and review projections.
   */
  static async getRelatedProducts(
    product: { id: string; categoryId: string | null; subCategoryId: string | null },
    limit = 4,
  ) {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      select: { id: true, parentId: true },
    });
    const scopes = getRelatedCategoryScopes(
      [product.categoryId, product.subCategoryId],
      categories,
    );
    if (!scopes) return [];

    const candidateLimit = Math.max(limit * 3, limit);
    const baseWhere: Prisma.ProductWhereInput = {
      id: { not: product.id },
      status: { in: ["ACTIVE", "PUBLISHED"] },
      deletedAt: null,
    };
    const categoryWhere = (ids: string[]): Prisma.ProductWhereInput => ({
      ...baseWhere,
      OR: [{ categoryId: { in: ids } }, { subCategoryId: { in: ids } }],
    });
    const include = {
      images: { take: 1, orderBy: [{ isFeatured: "desc" as const }, { sortOrder: "asc" as const }] },
      variants: { select: { isActive: true, inventoryCount: true, price: true } },
      category: { select: marketplaceCategorySelect },
      subCategory: { select: marketplaceCategorySelect },
      vendor: { select: { id: true, storeName: true, slug: true, logoUrl: true } },
      reviews: { where: { status: "PUBLISHED" as const }, select: { rating: true } },
    };
    const find = (ids: string[]) =>
      ids.length
        ? prisma.product.findMany({
            where: categoryWhere(ids),
            include,
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            take: candidateLimit,
          })
        : Promise.resolve([]);
    const [sameLeaf, siblings, sameMainCategory] = await Promise.all([
      find([scopes.leafCategoryId]),
      find(scopes.siblingIds),
      find(scopes.mainCategoryIds),
    ]);

    return selectRelatedCandidates(
      [sameLeaf, siblings, sameMainCategory].map((group) =>
        group.map((candidate) =>
          serializeMarketplaceProduct(candidate as unknown as Record<string, unknown>),
        ),
      ),
      limit,
    );
  }

  // ==========================================
  // CREATE OPERATION
  // ==========================================

  /**
   * Create a new product with images
   */
  static async createProduct(input: CreateProductInput) {
    await CategoryService.assertCompatibleProductCategories(input.categoryId, input.subCategoryId);
    const variants = validateVariants(input.variants);
    const needsAutomaticVariantSkus = variants.some((variant) => !variant.sku);
    const activeVariants = variants.filter((variant) => variant.isActive);
    const derivedSizes = activeVariants.map((variant) => variant.options.Size ?? variant.options.size).filter((value): value is string => Boolean(value));
    const derivedColors = activeVariants.map((variant) => variant.options.Colour ?? variant.options.Color ?? variant.options.colour ?? variant.options.color).filter((value): value is string => Boolean(value));
    const createStartedAt = performance.now();
    const writeProduct = async (productId: string, preparedVariants: typeof variants) =>
      prisma.$transaction(async (tx) => {
        const transactionStartedAt = performance.now();
        const product = await tx.product.create({
          data: {
        id: productId,
        vendorId: input.vendorId,
        name: input.name,
        slug: input.slug,
        brand: input.brand,
        description: input.description,
        basePrice: input.basePrice,
        compareAtPrice: input.compareAtPrice,
        categoryId: input.categoryId || null,
        subCategoryId: input.subCategoryId || null,
        inventoryCount: variants.length ? activeVariants.reduce((sum, variant) => sum + variant.inventoryCount, 0) : input.inventoryCount || 0,
        sku: input.sku,
        status: input.status || "DRAFT",
        sizes: variants.length ? [...new Set(derivedSizes)] : input.sizes || [],
        colors: variants.length ? [...new Set(derivedColors)] : input.colors || [],
        specs: input.specs as Prisma.JsonArray,
        tags: input.tags || [],
        images: input.images
          ? {
              create: input.images.map((img, index) => ({
                url: img.url,
                isFeatured: img.isFeatured || index === 0,
                sortOrder: img.sortOrder || index,
              })),
            }
          : undefined,
      },
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true, subCategory: true },
        });
        if (preparedVariants.length) {
          await tx.productVariant.createMany({
            data: preparedVariants.map((variant) => ({
              productId,
              sku: variant.sku!,
              name: variant.name,
              price: variant.price,
              inventoryCount: variant.inventoryCount,
              options: variant.options as Prisma.InputJsonValue,
              optionKey: variant.optionKey,
              isActive: variant.isActive,
            })),
          });
        }
        if (process.env.NODE_ENV !== "production") {
          console.info("[ProductService.createProduct] transaction timings", {
            variantCount: preparedVariants.length,
            transactionMs: Math.round(performance.now() - transactionStartedAt),
          });
        }
        return product;
      }, { timeout: 10_000, maxWait: 5_000 });

    try {
      // A product id is assigned before the transaction so all automatic SKUs can
      // be generated up-front and written in one batch rather than 12+ sequential
      // round trips. The timeout is local to this write and protects slower hosted
      // connections while retaining an atomic product/media/variant commit.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const productId = randomUUID();
        const preparedVariants = variants.map((variant) => ({
          ...variant,
          sku: variant.sku?.trim() || generateVariantSku(productId),
        }));
        try {
          const product = await writeProduct(productId, preparedVariants);
          if (process.env.NODE_ENV !== "production") {
            console.info("[ProductService.createProduct] completed", {
              variantCount: variants.length,
              totalMs: Math.round(performance.now() - createStartedAt),
            });
          }
          return product;
        } catch (error) {
          // Only retry a batch collision when we generated at least one SKU. An
          // explicit SKU conflict is a real validation failure and must surface.
          if (!needsAutomaticVariantSkus || !isSkuCollision(error) || attempt === 4) throw error;
        }
      }
      throw new Error("Unable to assign unique variant SKUs.");
    } catch (error) {
      // Keep the client-facing error sanitized, but make production/development
      // logs actionable without recording SKU, image URL, or option values.
      const prismaError = error instanceof Prisma.PrismaClientKnownRequestError
        ? { code: error.code, meta: error.meta }
        : error instanceof Prisma.PrismaClientValidationError
          ? { validation: true }
          : undefined;
      console.error("[ProductService.createProduct] transaction failed", {
        productName: input.name,
        variantCount: variants.length,
        activeVariantCount: activeVariants.length,
        hasCompareAtPrice: input.compareAtPrice !== undefined && input.compareAtPrice !== null,
        hasCategory: Boolean(input.categoryId),
        hasSubCategory: Boolean(input.subCategoryId),
        imageCount: input.images?.length ?? 0,
        prismaError,
      });
      throw error;
    }
  }

  // ==========================================
  // UPDATE OPERATION
  // ==========================================

  /**
   * Update an existing product
   */
  static async updateProduct(input: UpdateProductInput) {
    if (input.categoryId !== undefined || input.subCategoryId !== undefined) {
      const existing = await prisma.product.findUnique({ where: { id: input.id }, select: { categoryId: true, subCategoryId: true } });
      await CategoryService.assertCompatibleProductCategories(input.categoryId !== undefined ? input.categoryId : existing?.categoryId, input.subCategoryId !== undefined ? input.subCategoryId : existing?.subCategoryId);
    }
    const variants = input.variants === undefined ? undefined : validateVariants(input.variants);
    return prisma.$transaction(async (tx) => {
      if (variants !== undefined) {
        const existing = await tx.productVariant.findMany({ where: { productId: input.id }, include: { _count: { select: { orderItems: true } } } });
        const existingById = new Map(existing.map((variant) => [variant.id, variant]));
        for (const variant of variants) {
          if (variant.id && !existingById.has(variant.id)) throw new Error("Variant does not belong to this product.");
        }
        const retained = new Set(variants.flatMap((variant) => variant.id ? [variant.id] : []));
        for (const old of existing.filter((variant) => !retained.has(variant.id))) {
          if (old._count.orderItems) await tx.productVariant.update({ where: { id: old.id }, data: { isActive: false } });
          else await tx.productVariant.delete({ where: { id: old.id } });
        }
        for (const variant of variants) {
          const data = { name: variant.name, price: variant.price, inventoryCount: variant.inventoryCount, options: variant.options as Prisma.InputJsonValue, optionKey: variant.optionKey, isActive: variant.isActive };
          if (variant.id) {
            const current = existingById.get(variant.id)!;
            await tx.productVariant.update({ where: { id: variant.id }, data: { ...data, sku: variant.sku?.trim() || current.sku } });
          } else await createVariantWithSku(tx, { productId: input.id, ...data, sku: variant.sku });
        }
      }
      const active = variants?.filter((variant) => variant.isActive) ?? [];
      const sizes = variants ? [...new Set(active.map((variant) => variant.options.Size ?? variant.options.size).filter((value): value is string => Boolean(value)))] : input.sizes;
      const colors = variants ? [...new Set(active.map((variant) => variant.options.Colour ?? variant.options.Color ?? variant.options.colour ?? variant.options.color).filter((value): value is string => Boolean(value)))] : input.colors;
      const inventoryCount = variants ? active.reduce((sum, variant) => sum + variant.inventoryCount, 0) : input.inventoryCount;
      return tx.product.update({
      where: { id: input.id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.slug && { slug: input.slug }),
        ...(input.brand !== undefined && { brand: input.brand }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
        ...(input.compareAtPrice !== undefined && {
          compareAtPrice: input.compareAtPrice,
        }),
        ...(input.categoryId !== undefined && {
          categoryId: input.categoryId,
        }),
        ...(input.subCategoryId !== undefined && {
          subCategoryId: input.subCategoryId,
        }),
        ...(inventoryCount !== undefined && {
          inventoryCount,
        }),
        ...(input.sku !== undefined && { sku: input.sku }),
        ...(input.status && { status: input.status }),
        ...(sizes && { sizes }),
        ...(colors && { colors }),
        ...(input.specs && { specs: input.specs as Prisma.JsonArray }),
        ...(input.tags && { tags: input.tags }),
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
        subCategory: true,
      },
      });
    });
  }

  // ==========================================
  // DELETE OPERATIONS
  // ==========================================

  /**
   * Soft delete a product
   */
  static async deleteProduct(id: string) {
    return prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "ARCHIVED",
      },
    });
  }

  /**
   * Permanently delete a product
   */
  static async hardDeleteProduct(id: string) {
    return prisma.product.delete({
      where: { id },
    });
  }
}
