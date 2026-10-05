import { MarketplaceReportService } from "@/services/marketplace-reports";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; return v1Data(await MarketplaceReportService.getForCurrentUser(id), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
