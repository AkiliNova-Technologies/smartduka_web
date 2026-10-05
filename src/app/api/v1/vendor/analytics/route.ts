import { NextRequest } from "next/server";
import { analyticsPeriodSchema } from "@/lib/api/v1/contracts";
import { VendorMobileInsightsService } from "@/services/vendor-mobile-insights";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function GET(request: NextRequest) { try { const period = analyticsPeriodSchema.parse(request.nextUrl.searchParams.get("period") ?? "7D"); return v1Data(await VendorMobileInsightsService.analytics(period), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
