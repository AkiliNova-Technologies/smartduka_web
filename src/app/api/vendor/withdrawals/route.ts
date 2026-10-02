import { NextRequest } from "next/server";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { requireVendorContext, VendorAuthorizationError } from "@/lib/auth/vendor-context";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { VendorWithdrawalService, WithdrawalError } from "@/services/vendor-withdrawal";
import { revalidateTag } from "next/cache";
import { cacheTags } from "@/lib/cache-policy";

export async function GET() {
  try {
    const context = await requireVendorContext("vendor:request_payout");
    const withdrawals = await VendorWithdrawalService.listWithdrawals(context.vendorId);
    return successResponse({ withdrawals });
  } catch (error: unknown) {
    return errorResponse(getErrorMessage(error), error instanceof AuthenticationRequiredError ? 401 : error instanceof VendorAuthorizationError ? 403 : 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireVendorContext("vendor:request_payout");
    const body = await request.json();
    const payout = await VendorWithdrawalService.requestWithdrawal({
      vendorId: context.vendorId,
      userId: context.user.id,
      amount: body.amount,
      currency: body.currency,
      destinationId: body.destinationId,
      withdrawalRequestId: body.withdrawalRequestId,
    });
    revalidateTag(cacheTags.vendorEarnings(context.vendorId), "max");
    return successResponse({ id: payout.id, amount: payout.amount, currency: payout.currency, status: payout.status, maskedDestination: payout.maskedDestination }, 201);
  } catch (error: unknown) {
    return errorResponse(getErrorMessage(error), error instanceof AuthenticationRequiredError ? 401 : error instanceof VendorAuthorizationError ? 403 : error instanceof WithdrawalError ? 400 : 500);
  }
}
