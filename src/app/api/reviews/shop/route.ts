import { NextRequest } from "next/server";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { ReviewError, ReviewService } from "@/services/reviews";
import { AuthenticationRequiredError, AccountInactiveError } from "@/lib/auth/session";
export async function GET(request: NextRequest) { try { const vendorId = request.nextUrl.searchParams.get("vendorId"); if (!vendorId) return errorResponse("vendorId is required.", 400); return successResponse({ summary: await ReviewService.shopSummary(vendorId), reviews: await ReviewService.publicShopReviews(vendorId) }); } catch (error) { return errorResponse(getErrorMessage(error), 500); } }
export async function POST(request: NextRequest) { try { return successResponse({ review: await ReviewService.createShopReviewForCurrentUser(await request.json()) }, 201); } catch (error) { const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AccountInactiveError ? 403 : error instanceof ReviewError ? error.code === "DUPLICATE" ? 409 : error.code === "INELIGIBLE" ? 403 : 400 : 500; return errorResponse(getErrorMessage(error), status); } }
