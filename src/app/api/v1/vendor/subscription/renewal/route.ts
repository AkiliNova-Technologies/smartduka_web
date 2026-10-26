import { z } from "zod";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { VendorSubscriptionLifecycleService } from "@/services/vendor-subscription-lifecycle";
const schema = z.object({ idempotencyKey: z.string().min(8).max(191) }).strict();
export async function POST(request: Request) { try { return v1Data(await VendorSubscriptionLifecycleService.establishRenewalEligibility(schema.parse(await request.json()).idempotencyKey), 201, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
