import { requireAdminContext } from "@/lib/auth/admin-context";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma/client";
import { PaymentReconciliationService } from "@/services/payment-reconciliation";
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) { try { const admin = await requireAdminContext("platform:manage_billing"); const id = (await params).id; const outcome = await PaymentReconciliationService.reconcilePaymentIntent(id, "ADMIN_STATUS_REQUERY"); await prisma.auditLog.create({ data: { userId: admin.userId, action: "PAYMENT_ADMIN_PROVIDER_RECHECK", entity: "PaymentIntent", entityId: id, newValues: { providerAuthoritative: true, outcome: outcome.outcome } } }); return successResponse(outcome); } catch (error) { return errorResponse(getErrorMessage(error), 400); } }
