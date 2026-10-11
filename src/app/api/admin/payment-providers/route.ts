import { requireAdminContext } from "@/lib/auth/admin-context";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { PaymentProviderRegistry } from "@/lib/payments/payment-provider";
import { AdminPaymentOperationsService } from "@/services/admin-payment-operations";
export async function GET() { try { await requireAdminContext("platform:manage_billing"); const readiness = PaymentProviderRegistry.getReadiness("MTN_MOMO"); return successResponse({ providers: [{ ...readiness, realCallbackDeliveryQualified: process.env.MTN_MOMO_REAL_CALLBACK_DELIVERY_VERIFIED?.toLowerCase() === "true", productionMarketplaceReady: readiness.customerPaymentsReady && readiness.environment === "production" }], diagnostics: await AdminPaymentOperationsService.diagnostics() }); } catch (error) { return errorResponse(getErrorMessage(error), 403); } }
