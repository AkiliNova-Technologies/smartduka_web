"use server";

import { WishlistService } from "@/services/wishlist";
import { requireActiveUserId } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { withErrorHandling } from "@/lib/api-utils";

export async function getUserWishlistAction() {
  return withErrorHandling(async () => {
    const userId = await requireActiveUserId();
    const items = await WishlistService.getUserWishlist(userId);

    return items;
  }, "getUserWishlistAction");
}

export async function toggleWishlistAction(productId: string) {
  return withErrorHandling(async () => {
    const userId = await requireActiveUserId();
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
    const userId = await requireActiveUserId();
    await WishlistService.removeFromWishlist(userId, productId);
    revalidatePath("/wishlist");
    return { removed: true };
  }, "removeFromWishlistAction");
}

export async function clearWishlistAction() {
  return withErrorHandling(async () => {
    const userId = await requireActiveUserId();
    await WishlistService.clearWishlist(userId);
    revalidatePath("/wishlist");
    return { cleared: true };
  }, "clearWishlistAction");
}
