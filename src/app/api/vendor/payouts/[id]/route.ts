import { AuthenticationRequiredError } from "@/lib/auth/session";
import { VendorAuthorizationError } from "@/lib/auth/vendor-context";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { VendorPayoutError, VendorPayoutService } from "@/services/vendor-payout";

function status(error: unknown) { return error instanceof AuthenticationRequiredError ? 401 : error instanceof VendorAuthorizationError ? 403 : error instanceof VendorPayoutError ? error.code === "NOT_FOUND" ? 404 : 400 : 500; }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    if (body?.action !== "set-default") return errorResponse("Unsupported payout action.", 400);
    return successResponse(await VendorPayoutService.setDefaultPayoutAccount((await params).id));
  } catch (error) { return errorResponse(getErrorMessage(error), status(error)); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return successResponse(await VendorPayoutService.disablePayoutAccount((await params).id)); }
  catch (error) { return errorResponse(getErrorMessage(error), status(error)); }
}
