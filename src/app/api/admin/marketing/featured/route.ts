import { NextRequest } from "next/server";
import { MarketingError, MarketingService } from "@/services/marketing";
import { errorResponse,getErrorMessage,successResponse } from "@/lib/api-utils";
import { AdminAuthorizationError } from "@/lib/auth/admin-context";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { revalidateTag } from "next/cache";
import { cacheTags } from "@/lib/cache-policy";
const invalidateDiscovery = () => revalidateTag(cacheTags.marketplace.discovery, "max");
const fail=(e:unknown)=>e instanceof MarketingError?errorResponse(e.message,e.code==="FEATURED_ORDER_CONFLICT"?409:400,e.code):errorResponse(getErrorMessage(e),e instanceof AuthenticationRequiredError?401:e instanceof AdminAuthorizationError?403:400);
export async function GET(){try{return successResponse({products:await MarketingService.featuredProducts(),shops:await MarketingService.featuredShops()});}catch(e){return fail(e)}}
export async function POST(req:NextRequest){try{const body=await req.json();if(body.kind!=="product"&&body.kind!=="shop")return errorResponse("Invalid featured type.",400);const item=await MarketingService.saveFeatured(body.kind,body.entityId,Number(body.priority)||100,body.isActive!==false,body.startsAt,body.endsAt);invalidateDiscovery();return successResponse(item,201)}catch(e){return fail(e)}}
export async function PATCH(req:NextRequest){try{const body=await req.json();if(body.kind!=="product"&&body.kind!=="shop")return errorResponse("Invalid featured type.",400,"INVALID_FEATURED_REORDER");const items=await (body.kind==="product"?MarketingService.reorderFeaturedProducts(body.orderedIds):MarketingService.reorderFeaturedShops(body.orderedIds));invalidateDiscovery();return successResponse(items);}catch(e){return fail(e)}}
export async function DELETE(req:NextRequest){try{const {kind,id}=await req.json();if((kind!=="product"&&kind!=="shop")||!id)return errorResponse("Invalid featured item.",400);await MarketingService.removeFeatured(kind,id);invalidateDiscovery();return successResponse({deleted:true});}catch(e){return fail(e)}}
