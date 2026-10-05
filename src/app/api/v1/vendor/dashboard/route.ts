import { VendorMobileInsightsService } from "@/services/vendor-mobile-insights";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function GET() { try { return v1Data(await VendorMobileInsightsService.dashboard(), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
