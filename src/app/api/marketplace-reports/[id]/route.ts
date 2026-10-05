import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { MarketplaceReportError, MarketplaceReportService } from "@/services/marketplace-reports";
export async function GET(_request: Request, context: RouteContext<"/api/marketplace-reports/[id]">) { try { const { id } = await context.params; return successResponse({ report: await MarketplaceReportService.getForCurrentUser(id) }); } catch (error) { return errorResponse(getErrorMessage(error), error instanceof MarketplaceReportError && error.code === "NOT_FOUND" ? 404 : 403); } }
