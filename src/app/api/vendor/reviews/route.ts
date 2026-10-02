import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { ReviewService } from "@/services/reviews";
export async function GET() { try { return successResponse(await ReviewService.listForCurrentVendor()); } catch (error) { return errorResponse(getErrorMessage(error), 403); } }
