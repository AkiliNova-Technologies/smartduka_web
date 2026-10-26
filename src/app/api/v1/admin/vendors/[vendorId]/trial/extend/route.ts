import { z } from "zod";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { VendorSubscriptionLifecycleService } from "@/services/vendor-subscription-lifecycle";
const schema = z.object({ expiresAt: z.coerce.date(), reason: z.string().trim().min(8).max(1000) }).strict();
export async function POST(request: Request, context: { params: Promise<{ vendorId: string }> }) { try { const { vendorId } = await context.params; const input = schema.parse(await request.json()); return v1Data(await VendorSubscriptionLifecycleService.extendTrialForAdmin(vendorId, input.expiresAt, input.reason), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
