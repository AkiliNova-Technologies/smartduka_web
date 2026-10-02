import { NextRequest } from "next/server";
import { PromotionStatus } from "@prisma/client";
import { MarketingService, PromotionValidationError } from "@/services/marketing";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { AdminAuthorizationError } from "@/lib/auth/admin-context";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { revalidateTag } from "next/cache";
import { cacheTags } from "@/lib/cache-policy";
const invalidatePromotions = () => revalidateTag(cacheTags.marketplace.promotions, "max");
const fail=(e:unknown)=> {
  if (e instanceof PromotionValidationError) {
    console.warn("[Marketing Promotions] Validation failed", { code: e.code, fields: e.errors ? Object.keys(e.errors) : [] });
    return errorResponse(e.message, 400, e.code, e.errors);
  }
  return errorResponse(getErrorMessage(e), e instanceof AuthenticationRequiredError ? 401 : e instanceof AdminAuthorizationError ? 403 : 400);
};
export async function GET(){try{return successResponse({promotions:await MarketingService.adminList()});}catch(e){return fail(e)}}
export async function POST(req:NextRequest){try{const promotion=await MarketingService.savePromotion(await req.json());invalidatePromotions();return successResponse(promotion,201)}catch(e){return fail(e)}}
export async function PATCH(req:NextRequest){try{const {id,status,...input}=await req.json();if(!id)return errorResponse("Promotion id is required.",400);const promotion=status && Object.keys(input).length===0?await MarketingService.setPromotionStatus(id,status as PromotionStatus):await MarketingService.savePromotion(input,id);invalidatePromotions();return successResponse(promotion);}catch(e){return fail(e)}}
