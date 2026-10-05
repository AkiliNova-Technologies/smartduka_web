import { MarketplaceReportReason, MarketplaceReportTargetType } from "@prisma/client";
import { MarketplaceReportService } from "@/services/marketplace-reports";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function GET() { try { return v1Data(await MarketplaceReportService.listForCurrentUser(), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
export async function POST(request: Request) { try { const body = await request.json(); const report = await MarketplaceReportService.createForCurrentUser({ targetType: body.targetType as MarketplaceReportTargetType, targetId: body.targetId, reason: body.reason as MarketplaceReportReason, description: body.description }); return v1Data(report, 201); } catch (error) { return v1Exception(error); } }
