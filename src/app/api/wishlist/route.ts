import { NextRequest } from "next/server";
import { AuthenticationRequiredError, requireActiveUserId } from "@/lib/auth/session";
import { WishlistService } from "@/services/wishlist";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function GET() {
  try {
    const userId = await requireActiveUserId();
    const items = await WishlistService.getUserWishlist(userId);

    return successResponse({ items });
  } catch (error: unknown) {
    console.error("[Wishlist API GET]", error);
    return errorResponse(
      getErrorMessage(error),
      error instanceof AuthenticationRequiredError ? 401 : 500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireActiveUserId();
    const { productId } = await req.json();

    if (!productId) {
      return errorResponse("productId is required", 400);
    }

    await WishlistService.addToWishlist(userId, productId);
    return successResponse({ added: true });
  } catch (error: unknown) {
    console.error("[Wishlist API POST]", error);
    return errorResponse(
      getErrorMessage(error),
      error instanceof AuthenticationRequiredError ? 401 : 500,
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireActiveUserId();
    const { productId } = await req.json();

    if (!productId) {
      return errorResponse("productId is required", 400);
    }

    await WishlistService.removeFromWishlist(userId, productId);
    return successResponse({ removed: true });
  } catch (error: unknown) {
    console.error("[Wishlist API DELETE]", error);
    return errorResponse(
      getErrorMessage(error),
      error instanceof AuthenticationRequiredError ? 401 : 500,
    );
  }
}
