import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { WishlistService } from "@/services/wishlist";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const items = await WishlistService.getUserWishlist(userId);

    const serialized = items.map((item) => ({
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
      vendorId: item.product.vendorId,
      vendorName: item.product.vendor?.storeName || "Unknown Store",
      addedAt: item.createdAt.toISOString(),
    }));

    return successResponse({ items: serialized });
  } catch (error: unknown) {
    console.error("[Wishlist API GET]", error);
    return errorResponse(getErrorMessage(error));
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { productId } = await req.json();

    if (!productId) {
      return errorResponse("productId is required", 400);
    }

    await WishlistService.addToWishlist(userId, productId);
    return successResponse({ added: true });
  } catch (error: unknown) {
    console.error("[Wishlist API POST]", error);
    return errorResponse(getErrorMessage(error));
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { productId } = await req.json();

    if (!productId) {
      return errorResponse("productId is required", 400);
    }

    await WishlistService.removeFromWishlist(userId, productId);
    return successResponse({ removed: true });
  } catch (error: unknown) {
    console.error("[Wishlist API DELETE]", error);
    return errorResponse(getErrorMessage(error));
  }
}