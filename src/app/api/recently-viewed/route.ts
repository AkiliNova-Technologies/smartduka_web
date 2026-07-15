import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { RecentlyViewedService } from "@/services/recently-viewed";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const products = await RecentlyViewedService.getRecentlyViewed(userId);
    return successResponse(products);
  } catch (error: unknown) {
    console.error("[Recently Viewed API GET]", error);
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

    await RecentlyViewedService.trackView(userId, productId);
    return successResponse({ tracked: true });
  } catch (error: unknown) {
    console.error("[Recently Viewed API POST]", error);
    return errorResponse(getErrorMessage(error));
  }
}