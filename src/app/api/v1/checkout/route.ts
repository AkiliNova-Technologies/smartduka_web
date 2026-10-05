import { requireActiveUserId } from "@/lib/auth/session";
import { OrderService } from "@/services/order";
import { checkoutBodySchema } from "@/lib/api/v1/contracts";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function POST(request: Request) { try { const body = checkoutBodySchema.parse(await request.json()); const checkoutRequestId = request.headers.get("idempotency-key") ?? body.checkoutRequestId; const order = await OrderService.createOrder({ userId: await requireActiveUserId(), ...body, checkoutRequestId }); return v1Data(order, 201); } catch (error) { return v1Exception(error); } }
