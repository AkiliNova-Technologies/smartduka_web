import { requireActiveUserId } from "@/lib/auth/session";
import { PaymentStatusService } from "@/services/payment-status";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const status = await PaymentStatusService.getCustomerOrderPaymentStatus(await requireActiveUserId(), id);
    if (!status) return v1Error("ORDER_NOT_FOUND", "Order not found.", 404);
    return v1Data(status);
  } catch (error) { return v1Exception(error); }
}
