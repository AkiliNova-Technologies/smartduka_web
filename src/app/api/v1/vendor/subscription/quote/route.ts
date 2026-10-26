import { z } from "zod";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { VendorSubscriptionService } from "@/services/vendor-subscriptions";
const schema = z.object({ planCode: z.enum(["STARTER", "GROWTH", "PREMIUM"]) }).strict();
export async function POST(request: Request) { try { return v1Data(await VendorSubscriptionService.quote(schema.parse(await request.json()).planCode), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
