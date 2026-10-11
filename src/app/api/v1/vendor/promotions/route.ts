import { z } from "zod";
import { revalidateTag } from "next/cache";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { cacheTags } from "@/lib/cache-policy";
import { VendorPromotionsService } from "@/services/vendor-promotions";
import { PromotionCapacityError, PromotionQuoteExpiredError } from "@/services/promotion-inventory";
const schema = z.object({ quoteId: z.string().uuid(), idempotencyKey: z.string().min(8).max(191) }).strict();
export async function GET(request: Request) { try { const query=new URL(request.url).searchParams; return v1Data(await VendorPromotionsService.list({page:Number(query.get("page")??1),pageSize:Number(query.get("pageSize")??25),search:query.get("search")??undefined,status:query.get("status")??undefined}), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
export async function POST(request: Request) { try { const created=await VendorPromotionsService.create(schema.parse(await request.json()));revalidateTag(cacheTags.marketplace.promotions,"max");revalidateTag(cacheTags.marketplace.discovery,"max");return v1Data(created, 201, { "Cache-Control": "private, no-store" }); } catch (error) { if(error instanceof PromotionCapacityError)return v1Error(error.code,error.message,409,{alternatives:error.alternatives.map(value=>value.toISOString()).join(",")});if(error instanceof PromotionQuoteExpiredError)return v1Error(error.code,error.message,409);return v1Exception(error); } }
