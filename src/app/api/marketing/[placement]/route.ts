import { PromotionPlacement } from "@prisma/client";
import { MarketingService } from "@/services/marketing";
import { errorResponse, successResponse } from "@/lib/api-utils";
export async function GET(_:Request,{params}:{params:Promise<{placement:string}>}){const {placement}=await params;if(!Object.values(PromotionPlacement).includes(placement as PromotionPlacement))return errorResponse("Invalid placement.",400);return successResponse({promotions:await MarketingService.publicPromotions(placement as PromotionPlacement)});}
