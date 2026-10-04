"use server";

import { getCurrentUserIdOrNull } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api-utils";
import { RecommendationService } from "@/services/recommendations";

export async function getRecommendationsAction(input: { recentProductIds?: string[]; cartProductIds?: string[]; excludeProductIds?: string[]; limit?: number }) {
  return withErrorHandling(async () => RecommendationService.getRecommendations({ ...input, userId: await getCurrentUserIdOrNull() }), "getRecommendationsAction");
}
