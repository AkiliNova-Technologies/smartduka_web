import { getCurrentUserIdOrNull } from "@/lib/auth/session";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { RecommendationService } from "@/services/recommendations";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cartProductIds = (url.searchParams.get("cartProductIds") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 50);
    return v1Data(
      await RecommendationService.getRecommendations({
        userId: await getCurrentUserIdOrNull(),
        cartProductIds,
        limit: 4,
      }),
      200,
      { "Cache-Control": "private, no-store" },
    );
  } catch (error) {
    return v1Exception(error);
  }
}
