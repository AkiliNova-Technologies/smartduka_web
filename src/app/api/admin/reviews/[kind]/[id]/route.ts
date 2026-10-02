import { NextRequest } from "next/server";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { ReviewService } from "@/services/reviews";
export async function PATCH(request: NextRequest, context: RouteContext<"/api/admin/reviews/[kind]/[id]">) { try { const { kind, id } = await context.params; if (kind !== "product" && kind !== "shop") return errorResponse("Invalid review type.", 400); const { status } = await request.json(); await ReviewService.moderateForCurrentAdmin(kind, id, status); return successResponse({ moderated: true }); } catch (error) { return errorResponse(getErrorMessage(error), 403); } }
