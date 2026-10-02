import { NextRequest } from "next/server";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { AuthenticationRequiredError, AccountInactiveError } from "@/lib/auth/session";
import { ReviewService } from "@/services/reviews";

export async function GET(request: NextRequest) {
  try {
    const kind = request.nextUrl.searchParams.get("kind");
    const id = request.nextUrl.searchParams.get("id");
    if (!id || (kind !== "product" && kind !== "shop")) {
      return errorResponse("A valid review type and resource id are required.", 400);
    }
    const purchases = kind === "product"
      ? await ReviewService.eligibleProductPurchasesForCurrentUser(id)
      : await ReviewService.eligibleShopPurchasesForCurrentUser(id);
    return successResponse({ purchases });
  } catch (error) {
    return errorResponse(
      getErrorMessage(error),
      error instanceof AuthenticationRequiredError ? 401 : error instanceof AccountInactiveError ? 403 : 500,
    );
  }
}
