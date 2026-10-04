import { prisma } from "@/lib/prisma/client";
import { serializeMarketplaceProduct } from "@/services/product";
import type { Prisma } from "@prisma/client";

export const RECENTLY_VIEWED_HISTORY_LIMIT = 24;
export const RECENTLY_VIEWED_DISPLAY_LIMIT = 12;

const publicProductInclude = {
  images: { take: 1, orderBy: [{ isFeatured: "desc" as const }, { sortOrder: "asc" as const }] },
  vendor: { select: { id: true, storeName: true, slug: true } },
  category: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true } } } },
  subCategory: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true } } } },
  variants: { select: { isActive: true, inventoryCount: true, price: true, options: true } },
  reviews: { where: { status: "PUBLISHED" as const }, select: { rating: true } },
} satisfies Prisma.ProductInclude;

const publicProductWhere: Prisma.ProductWhereInput = {
  status: { in: ["ACTIVE", "PUBLISHED"] },
  deletedAt: null,
  vendor: { status: "ACTIVE" as const, deletedAt: null },
};

// ==========================================
// RECENTLY VIEWED SERVICE
// ==========================================

export class RecentlyViewedService {
  /**
   * Track a product view for a user
   */
  static async trackView(userId: string, productId: string) {
    // Only valid public product pages may become part of a customer's history.
    const product = await prisma.product.findFirst({ where: { id: productId, ...publicProductWhere }, select: { id: true } });
    if (!product) return null;
    const item = await prisma.recentlyViewed.upsert({
      where: { userId_productId: { userId, productId } },
      update: { viewedAt: new Date() },
      create: { userId, productId },
    });
    await this.trimHistory(userId);
    return item;
  }

  /**
   * Get recently viewed products for a user
   */
  static async getRecentlyViewed(userId: string, limit = RECENTLY_VIEWED_DISPLAY_LIMIT) {
    const items = await prisma.recentlyViewed.findMany({
      where: { userId, product: publicProductWhere },
      include: {
        product: { include: publicProductInclude },
      },
      orderBy: { viewedAt: "desc" },
      take: Math.min(Math.max(1, limit), RECENTLY_VIEWED_DISPLAY_LIMIT),
    });

    return items.map((item) => ({
      ...serializeMarketplaceProduct(item.product as unknown as Record<string, unknown>),
      viewedAt: item.viewedAt.toISOString(),
    }));
  }

  /**
   * Merge guest viewing history into authenticated user's history
   */
  static async mergeGuestViews(userId: string, productIds: string[]) {
    if (productIds.length === 0) return;
    // Preserve the guest's recency order while avoiding unbounded request input.
    for (const productId of [...new Set(productIds)].slice(0, RECENTLY_VIEWED_HISTORY_LIMIT).reverse()) {
      await this.trackView(userId, productId);
    }
    await this.trimHistory(userId);
  }

  /**
   * Get products by IDs — preserves input order
   */
  static async getProductsByIds(productIds: string[]) {
    if (productIds.length === 0) return [];

    const products = await prisma.product.findMany({
      where: { id: { in: productIds.slice(0, RECENTLY_VIEWED_HISTORY_LIMIT) }, ...publicProductWhere },
      include: publicProductInclude,
    });

    // Preserve the order of productIds
    const productMap = new Map(products.map((p) => [p.id, p]));
    return productIds
      .map((id) => productMap.get(id))
      .filter(Boolean)
      .map((p) => serializeMarketplaceProduct(p! as unknown as Record<string, unknown>));
  }

  private static async trimHistory(userId: string) {
    const stale = await prisma.recentlyViewed.findMany({
      where: { userId }, orderBy: { viewedAt: "desc" }, skip: RECENTLY_VIEWED_HISTORY_LIMIT, select: { id: true },
    });
    if (stale.length) await prisma.recentlyViewed.deleteMany({ where: { id: { in: stale.map((item) => item.id) } } });
  }
}
