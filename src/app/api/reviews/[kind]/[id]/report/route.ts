import { NextRequest } from "next/server";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { ReviewError, ReviewService } from "@/services/reviews";
export async function POST(request: NextRequest, context: RouteContext<"/api/reviews/[kind]/[id]/report">) { try { const { kind, id } = await context.params; if (kind !== "product" && kind !== "shop") return errorResponse("Invalid review type.", 400); const { reason } = await request.json(); return successResponse({ report: await ReviewService.reportForCurrentUser(kind, id, reason) }, 201); } catch (error) { return errorResponse(getErrorMessage(error), error instanceof ReviewError && error.code === "DUPLICATE" ? 409 : 400); } }
