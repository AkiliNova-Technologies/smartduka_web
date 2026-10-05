import { VendorService } from "@/services/vendor";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
export async function GET(_: Request, { params }: { params: Promise<{ idOrSlug: string }> }) { try { const { idOrSlug } = await params; const shop = await VendorService.getPublicShopBySlug(idOrSlug); return shop ? v1Data(shop, 200, { "Cache-Control": "public, max-age=60" }) : v1Error("NOT_FOUND", "Shop not found.", 404); } catch (error) { return v1Exception(error); } }
