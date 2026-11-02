import { z } from "zod";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { VendorSubscriptionService } from "@/services/vendor-subscriptions";
const schema = z.object({ planCode: z.enum(["STARTER", "GROWTH", "PREMIUM", "ENTERPRISE"]), billingInterval: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY") }).strict();
export async function POST(request: Request) { try { const input = schema.parse(await request.json()); return v1Data(await VendorSubscriptionService.quote(input.planCode, input.billingInterval), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
