import { MarketingService } from "@/services/marketing";
import { successResponse } from "@/lib/api-utils";
import { connection } from "next/server";
export async function GET(){await connection();return successResponse({products:await MarketingService.publicFeaturedProducts(),shops:await MarketingService.publicFeaturedShops()});}
