import { VendorTeamService } from "@/services/vendor-team";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function GET() { try { return v1Data(await VendorTeamService.list(), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
