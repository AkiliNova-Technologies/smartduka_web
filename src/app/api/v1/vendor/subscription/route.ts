import { z } from "zod";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { VendorSubscriptionService } from "@/services/vendor-subscriptions";
const schema = z.object({ planCode: z.enum(["STARTER", "BUSINESS"]), idempotencyKey: z.string().min(8).max(191) }).strict();
export async function GET() { try { return v1Data(await VendorSubscriptionService.read(), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
export async function POST(request: Request) { try { return v1Data(await VendorSubscriptionService.purchase(schema.parse(await request.json())), 201, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
