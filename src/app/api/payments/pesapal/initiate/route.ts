import { NextRequest } from "next/server";
import { AccountInactiveError, AuthenticationRequiredError, requireActiveUserId } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { PesapalPaymentError, PesapalPaymentService } from "@/services/payments/pesapal-payment-service";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireActiveUserId();
    const body: unknown = await request.json();
    const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
    if (typeof input.orderId !== "string" || typeof input.initiationRequestId !== "string") return errorResponse("Invalid payment initiation request.", 400);
    const result = await PesapalPaymentService.initiatePayment({ authenticatedUserId: userId, orderId: input.orderId, initiationRequestId: input.initiationRequestId });
    return successResponse(result);
  } catch (error: unknown) {
    const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AccountInactiveError ? 403 : error instanceof PesapalPaymentError ? ["ORDER_UNAVAILABLE"].includes(error.code) ? 404 : ["INVALID_REQUEST"].includes(error.code) ? 400 : ["ORDER_INELIGIBLE", "INITIATION_CONFLICT", "RECONCILIATION_REQUIRED"].includes(error.code) ? 409 : 502 : 500;
    return errorResponse(error instanceof Error ? error.message : "Unable to initiate payment.", status);
  }
}
