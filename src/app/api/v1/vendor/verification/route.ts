import { ShopVerificationService } from "@/services/shop-verifications";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function GET() { try { return v1Data(await ShopVerificationService.getForVendor(), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
