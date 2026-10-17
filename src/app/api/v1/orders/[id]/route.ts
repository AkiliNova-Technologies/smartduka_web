import { requireActiveUserId } from "@/lib/auth/session";
import { OrderService } from "@/services/order";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; const order = await OrderService.getUserOrder(await requireActiveUserId(), id); return order ? v1Data(order, 200, { "Cache-Control": "private, no-store" }) : v1Error("ORDER_NOT_FOUND", "Order not found.", 404); } catch (error) { return v1Exception(error); } }
