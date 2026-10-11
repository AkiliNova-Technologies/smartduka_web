import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { AdminPaymentOperationsService } from "@/services/admin-payment-operations";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const payment = await AdminPaymentOperationsService.detail((await params).id); return payment ? successResponse(payment) : errorResponse("Payment intent not found.", 404); } catch (error) { return errorResponse(getErrorMessage(error), 403); } }
