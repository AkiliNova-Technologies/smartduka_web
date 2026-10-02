import { prisma } from "@/lib/prisma/client";
import { serializeMarketplaceProduct } from "@/services/product";

// ==========================================
// WISHLIST SERVICE
// ==========================================

export class WishlistService {
  static async getUserWishlist(userId: string) {
    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { take: 1, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }] },
            variants: { select: { isActive: true, inventoryCount: true, price: true } },
            category: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true } } } } } },
            subCategory: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true } } } } } },
            vendor: {
              select: { id: true, storeName: true, slug: true },
            },
            reviews: { where: { status: "PUBLISHED" }, select: { rating: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return items.map((item) => ({
      ...serializeMarketplaceProduct(item.product as unknown as Record<string, unknown>),
      productId: item.productId,
      price: Number(item.product.basePrice),
      addedAt: item.createdAt.toISOString(),
    }));
  }

  static async addToWishlist(userId: string, productId: string) {
    return prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
      include: {
        product: {
          include: {
            images: { take: 1, orderBy: { sortOrder: "asc" } },
            vendor: { select: { id: true, storeName: true, slug: true } },
          },
        },
      },
    });
  }

  static async removeFromWishlist(userId: string, productId: string) {
    return prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });
  }

  static async isWishlisted(userId: string, productId: string) {
    const item = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return !!item;
  }

  static async clearWishlist(userId: string) {
    return prisma.wishlistItem.deleteMany({
      where: { userId },
    });
  }
}
