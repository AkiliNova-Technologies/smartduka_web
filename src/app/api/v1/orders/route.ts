import { requireActiveUserId } from "@/lib/auth/session";
import { OrderService } from "@/services/order";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function GET() { try { return v1Data(await OrderService.getUserOrders(await requireActiveUserId()), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
