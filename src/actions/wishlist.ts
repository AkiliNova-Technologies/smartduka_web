"use server";

import { WishlistService } from "@/services/wishlist";
import { getCurrentUserId } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { withErrorHandling } from "@/lib/api-utils";

export async function getUserWishlistAction() {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    const items = await WishlistService.getUserWishlist(userId);

    return items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      slug: item.product.slug,
      brand: item.product.brand,
      basePrice: Number(item.product.basePrice),
      compareAtPrice: item.product.compareAtPrice
        ? Number(item.product.compareAtPrice)
        : null,
      image: item.product.images[0]?.url || "",
      rating: 4.5,
      reviews: 0,
      vendorId: item.product.vendorId,
      vendorName: item.product.vendor?.storeName || "Unknown Store",
      addedAt: item.createdAt.toISOString(),
    }));
  }, "getUserWishlistAction");
}

export async function toggleWishlistAction(productId: string) {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    const isWishlisted = await WishlistService.isWishlisted(userId, productId);

    if (isWishlisted) {
      await WishlistService.removeFromWishlist(userId, productId);
      revalidatePath("/wishlist");
      return { action: "removed" as const };
    } else {
      await WishlistService.addToWishlist(userId, productId);
      revalidatePath("/wishlist");
      return { action: "added" as const };
    }
  }, "toggleWishlistAction");
}

export async function removeFromWishlistAction(productId: string) {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    await WishlistService.removeFromWishlist(userId, productId);
    revalidatePath("/wishlist");
    return { removed: true };
  }, "removeFromWishlistAction");
}

export async function clearWishlistAction() {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    await WishlistService.clearWishlist(userId);
    revalidatePath("/wishlist");
    return { cleared: true };
  }, "clearWishlistAction");
}