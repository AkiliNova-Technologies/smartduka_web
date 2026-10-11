import { AdvertisingPlacement } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { cacheTags } from "@/lib/cache-policy";
import { PromotionCapacityReductionError, PromotionInventoryService } from "@/services/promotion-inventory";
const schema=z.object({placement:z.nativeEnum(AdvertisingPlacement),capacity:z.number().int().min(1).max(4)}).strict();
export async function GET(){try{return v1Data(await PromotionInventoryService.adminState(),200,{"Cache-Control":"private, no-store"})}catch(error){return v1Exception(error)}}
export async function PATCH(request:Request){try{const input=schema.parse(await request.json()),saved=await PromotionInventoryService.updateCapacity(input.placement,input.capacity);revalidateTag(cacheTags.marketplace.promotions,"max");revalidateTag(cacheTags.marketplace.discovery,"max");return v1Data(saved)}catch(error){if(error instanceof PromotionCapacityReductionError)return v1Error(error.code,error.message,409,{confirmedPeak:String(error.confirmedPeak)});return v1Exception(error)}}
