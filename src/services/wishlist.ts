import { prisma } from "@/lib/prisma/client";

// ==========================================
// WISHLIST SERVICE
// ==========================================

export class WishlistService {
  static async getUserWishlist(userId: string) {
    return prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { take: 1, orderBy: { sortOrder: "asc" } },
            vendor: {
              select: { id: true, storeName: true, slug: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
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