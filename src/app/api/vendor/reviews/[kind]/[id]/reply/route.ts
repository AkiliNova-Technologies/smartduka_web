import { NextRequest } from "next/server";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { ReviewService } from "@/services/reviews";
export async function PUT(request: NextRequest, context: RouteContext<"/api/vendor/reviews/[kind]/[id]/reply">) { try { const { kind, id } = await context.params; if (kind !== "product" && kind !== "shop") return errorResponse("Invalid review type.", 400); const { body } = await request.json(); return successResponse({ reply: await ReviewService.replyForCurrentVendor(kind, id, body) }); } catch (error) { return errorResponse(getErrorMessage(error), 403); } }
