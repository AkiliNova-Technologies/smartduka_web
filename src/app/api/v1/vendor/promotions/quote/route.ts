import { z } from "zod";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { VendorPromotionsService } from "@/services/vendor-promotions";
const schema = z.object({ targetType: z.enum(["PRODUCT", "SHOP"]), targetId: z.string().min(1).optional(), durationDays: z.number().int(), applyCredit: z.boolean().default(true), requestedStartAt: z.string().datetime().nullable().optional() }).strict();
export async function POST(request: Request) { try { return v1Data(await VendorPromotionsService.quote(schema.parse(await request.json())), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
