import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { ShopVerificationError, ShopVerificationService } from "@/services/shop-verifications";

export async function GET() {
  try { return successResponse(await ShopVerificationService.getForVendor()); }
  catch (error) { return errorResponse(getErrorMessage(error), error instanceof ShopVerificationError && error.code === "NOT_FOUND" ? 404 : 403); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action === "provide-information") return successResponse(await ShopVerificationService.provideInformation(body.response));
    return successResponse(await ShopVerificationService.submit(), 201);
  } catch (error) { return errorResponse(getErrorMessage(error), 400); }
}
