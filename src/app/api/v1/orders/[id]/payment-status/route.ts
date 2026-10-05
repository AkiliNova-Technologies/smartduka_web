import { requireActiveUserId } from "@/lib/auth/session";
import { OrderService } from "@/services/order";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";

const normalized = (status: string) => status === "COMPLETED" ? "SUCCEEDED" : status === "FAILED" || status === "REVERSED" ? "FAILED" : "PENDING";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = (await OrderService.getUserOrders(await requireActiveUserId())).find((item) => item.id === id);
    if (!order) return v1Error("ORDER_NOT_FOUND", "Order not found.", 404);
    return v1Data({ status: normalized(order.paymentStatus), orderStatus: order.status, updatedAt: order.createdAt, canRetry: order.paymentStatus === "FAILED" });
  } catch (error) { return v1Exception(error); }
}
