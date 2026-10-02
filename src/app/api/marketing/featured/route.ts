import { MarketingService } from "@/services/marketing";
import { successResponse } from "@/lib/api-utils";
export async function GET(){return successResponse({products:await MarketingService.publicFeaturedProducts(),shops:await MarketingService.publicFeaturedShops()});}
