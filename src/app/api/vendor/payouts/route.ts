import { AuthenticationRequiredError } from "@/lib/auth/session";
import { VendorAuthorizationError } from "@/lib/auth/vendor-context";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { VendorPayoutError, VendorPayoutService } from "@/services/vendor-payout";

function status(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return 401;
  if (error instanceof VendorAuthorizationError) return 403;
  if (error instanceof VendorPayoutError) return error.code === "DUPLICATE" ? 409 : error.code === "NOT_FOUND" ? 404 : 400;
  return 500;
}

export async function GET() {
  try { return successResponse({ accounts: await VendorPayoutService.getPayoutAccounts() }); }
  catch (error) { return errorResponse(getErrorMessage(error), status(error)); }
}

export async function POST(request: Request) {
  try { return successResponse(await VendorPayoutService.addPayoutAccount(await request.json()), 201); }
  catch (error) { return errorResponse(getErrorMessage(error), status(error)); }
}
