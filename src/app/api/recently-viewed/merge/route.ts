import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { RecentlyViewedService } from "@/services/recently-viewed";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { productIds } = await req.json();

    if (!productIds || !Array.isArray(productIds)) {
      return errorResponse("productIds array is required", 400);
    }

    await RecentlyViewedService.mergeGuestViews(userId, productIds);
    return successResponse({ merged: true });
  } catch (error: unknown) {
    console.error("[Recently Viewed Merge API]", error);
    return errorResponse(getErrorMessage(error));
  }
}