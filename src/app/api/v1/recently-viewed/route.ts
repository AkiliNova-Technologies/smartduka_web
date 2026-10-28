import { requireActiveUserId } from "@/lib/auth/session";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { RecentlyViewedService } from "@/services/recently-viewed";

export async function GET() {
  try {
    return v1Data(
      await RecentlyViewedService.getRecentlyViewed(await requireActiveUserId(), 4),
      200,
      { "Cache-Control": "private, no-store" },
    );
  } catch (error) {
    return v1Exception(error);
  }
}

export async function POST(request: Request) {
  try {
    const productId = (await request.json() as { productId?: unknown }).productId;
    if (typeof productId !== "string" || !productId.trim()) {
      return v1Error("INVALID_REQUEST", "productId is required.", 400);
    }
    await RecentlyViewedService.trackView(await requireActiveUserId(), productId);
    return v1Data({ tracked: true });
  } catch (error) {
    return v1Exception(error);
  }
}
