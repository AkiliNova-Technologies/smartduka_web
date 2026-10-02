import { NextRequest } from "next/server";
import { AccountInactiveError, AuthenticationRequiredError, requireActiveUserId } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { PesapalPaymentError, PesapalPaymentService } from "@/services/payments/pesapal-payment-service";
import { PesapalClientError } from "@/services/payments/pesapal-client";

function sanitizedProviderMessage(message: string | undefined) {
  return message
    ?.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(?:\+?\d[\d -]{6,}\d)\b/g, "[redacted-number]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 300);
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireActiveUserId();
    const body: unknown = await request.json();
    const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
    if (typeof input.orderId !== "string" || typeof input.initiationRequestId !== "string") return errorResponse("Invalid payment initiation request.", 400);
    const result = await PesapalPaymentService.initiatePayment({ authenticatedUserId: userId, orderId: input.orderId, initiationRequestId: input.initiationRequestId });
    return successResponse(result);
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development" && error instanceof PesapalClientError) {
      console.error("Pesapal payment initiation failed", {
        code: error.code,
        httpStatus: error.status,
        providerCode: error.providerError?.code,
        providerType: error.providerError?.error_type ?? error.providerError?.type,
        providerMessage: sanitizedProviderMessage(error.providerError?.message),
      });
    }
    const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AccountInactiveError ? 403 : error instanceof PesapalPaymentError ? ["ORDER_UNAVAILABLE"].includes(error.code) ? 404 : ["INVALID_REQUEST"].includes(error.code) ? 400 : ["PESAPAL_AMOUNT_LIMIT"].includes(error.code) ? 422 : ["ORDER_INELIGIBLE", "INITIATION_CONFLICT", "RECONCILIATION_REQUIRED"].includes(error.code) ? 409 : 502 : 500;
    return errorResponse(error instanceof Error ? error.message : "Unable to initiate payment.", status);
  }
}
