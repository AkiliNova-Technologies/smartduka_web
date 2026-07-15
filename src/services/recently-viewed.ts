import { prisma } from "@/lib/prisma/client";

// ==========================================
// RECENTLY VIEWED SERVICE
// ==========================================

export class RecentlyViewedService {
  /**
   * Track a product view for a user
   */
  static async trackView(userId: string, productId: string) {
    return prisma.recentlyViewed.upsert({
      where: { userId_productId: { userId, productId } },
      update: { viewedAt: new Date() },
      create: { userId, productId },
    });
  }

  /**
   * Get recently viewed products for a user
   */
  static async getRecentlyViewed(userId: string, limit = 10) {
    const items = await prisma.recentlyViewed.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { take: 1, orderBy: { sortOrder: "asc" } },
            vendor: { select: { id: true, storeName: true, slug: true } },
          },
        },
      },
      orderBy: { viewedAt: "desc" },
      take: limit,
    });

    return items.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      brand: item.product.brand,
      basePrice: Number(item.product.basePrice),
      compareAtPrice: item.product.compareAtPrice
        ? Number(item.product.compareAtPrice)
        : null,
      image: item.product.images[0]?.url || "",
      vendorId: item.product.vendorId,
      vendorName: item.product.vendor?.storeName || "Unknown Store",
      rating: 4.5,
      reviews: 0,
      viewedAt: item.viewedAt.toISOString(),
    }));
  }

  /**
   * Merge guest viewing history into authenticated user's history
   */
  static async mergeGuestViews(userId: string, productIds: string[]) {
    if (productIds.length === 0) return;

    const data = productIds.map((productId) => ({
      userId,
      productId,
      viewedAt: new Date(),
    }));

    await prisma.recentlyViewed.createMany({
      data,
      skipDuplicates: true,
    });
  }

  /**
   * Get products by IDs — preserves input order
   */
  static async getProductsByIds(productIds: string[]) {
    if (productIds.length === 0) return [];

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: { in: ["ACTIVE", "PUBLISHED"] },
        deletedAt: null,
      },
      include: {
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        vendor: { select: { id: true, storeName: true, slug: true } },
      },
    });

    // Preserve the order of productIds
    const productMap = new Map(products.map((p) => [p.id, p]));
    return productIds
      .map((id) => productMap.get(id))
      .filter(Boolean)
      .map((p) => ({
        id: p!.id,
        name: p!.name,
        slug: p!.slug,
        brand: p!.brand,
        basePrice: Number(p!.basePrice),
        compareAtPrice: p!.compareAtPrice
          ? Number(p!.compareAtPrice)
          : null,
        image: p!.images[0]?.url || "",
        vendorId: p!.vendorId,
        vendorName: p!.vendor?.storeName || "Unknown Store",
        rating: 4.5,
        reviews: 0,
      }));
  }
}