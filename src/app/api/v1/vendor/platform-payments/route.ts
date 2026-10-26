import { z } from "zod";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { PlatformPaymentService } from "@/services/platform-payment";
const schema = z.object({ revenueOrderId: z.string().uuid(), payerPhone: z.string().min(7).max(32), idempotencyKey: z.string().min(8).max(191) }).strict();
export async function GET() { return v1Data(PlatformPaymentService.readiness(), 200, { "Cache-Control": "private, no-store" }); }
export async function POST(request: Request) { try { const context = await requireVendorContext("vendor:manage_shop"); return v1Data(await PlatformPaymentService.initiate({ ...schema.parse(await request.json()), vendorId: context.vendorId, actorUserId: context.user.id }), 201, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
