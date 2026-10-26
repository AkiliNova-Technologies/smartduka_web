import { z } from "zod";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { VendorSubscriptionLifecycleService } from "@/services/vendor-subscription-lifecycle";
const create = z.object({ planCode: z.enum(["STARTER", "GROWTH", "PREMIUM"]), idempotencyKey: z.string().min(8).max(191) }).strict();
export async function POST(request: Request) { try { const input = create.parse(await request.json()); return v1Data(await VendorSubscriptionLifecycleService.requestPlanChange(input.planCode, input.idempotencyKey), 201, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
export async function DELETE() { try { return v1Data(await VendorSubscriptionLifecycleService.cancelPlanChange(), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
