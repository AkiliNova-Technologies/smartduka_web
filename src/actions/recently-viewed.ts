"use server";

import { RecentlyViewedService } from "@/services/recently-viewed";
import { getCurrentUserId } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api-utils";

export async function trackProductViewAction(productId: string) {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    await RecentlyViewedService.trackView(userId, productId);
    return { tracked: true };
  }, "trackProductViewAction");
}

export async function getRecentlyViewedAction(limit = 10) {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    return RecentlyViewedService.getRecentlyViewed(userId, limit);
  }, "getRecentlyViewedAction");
}

export async function mergeGuestViewsAction(productIds: string[]) {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    await RecentlyViewedService.mergeGuestViews(userId, productIds);
    return { merged: true };
  }, "mergeGuestViewsAction");
}

export async function getProductsByIdsAction(productIds: string[]) {
  return withErrorHandling(
    () => RecentlyViewedService.getProductsByIds(productIds),
    "getProductsByIdsAction"
  );
}