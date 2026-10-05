import { VendorService } from "@/services/vendor";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function GET() { try { return v1Data(await VendorService.getPublicStoreListings(), 200, { "Cache-Control": "public, max-age=120" }); } catch (error) { return v1Exception(error); } }
