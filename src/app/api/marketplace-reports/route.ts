import { NextRequest } from "next/server";
import { MarketplaceReportReason, MarketplaceReportTargetType } from "@prisma/client";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { MarketplaceReportError, MarketplaceReportService } from "@/services/marketplace-reports";

export async function GET() { try { return successResponse({ reports: await MarketplaceReportService.listForCurrentUser() }); } catch (error) { return errorResponse(getErrorMessage(error), 401); } }
export async function POST(request: NextRequest) { try { const body = await request.json(); const report = await MarketplaceReportService.createForCurrentUser({ targetType: body.targetType as MarketplaceReportTargetType, targetId: body.targetId, reason: body.reason as MarketplaceReportReason, description: body.description }); return successResponse({ report }, 201); } catch (error) { const status = error instanceof MarketplaceReportError && error.code === "DUPLICATE" ? 409 : error instanceof MarketplaceReportError && error.code === "NOT_FOUND" ? 404 : 400; return errorResponse(getErrorMessage(error), status); } }
