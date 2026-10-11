import { z } from "zod";
import { PaymentProvider } from "@prisma/client";
import { requireActiveUserId } from "@/lib/auth/session";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { PaymentIntentService } from "@/services/payment-intent";
const schema = z.object({ subOrderId: z.string().uuid(), provider: z.enum([PaymentProvider.MTN_MOMO, PaymentProvider.AIRTEL_MONEY]), paymentRequestId: z.string().min(8).max(128), payerPhone: z.string().min(7).max(32).optional() }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const body = schema.parse(await request.json()); const { id } = await params; const intent = await PaymentIntentService.initiateForCustomer({ customerId: await requireActiveUserId(), orderId: id, subOrderId: body.subOrderId, provider: body.provider, idempotencyKey: body.paymentRequestId, payerPhone: body.payerPhone }); return v1Data({ paymentIntentId: intent.id, status: intent.status, provider: intent.provider, amount: Number(intent.amount), currency: intent.currency, providerReference: intent.providerReference }, 201); } catch (error) { return v1Exception(error); } }
