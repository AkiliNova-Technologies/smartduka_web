import { AdminAuthorizationError } from "@/lib/auth/admin-context";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { MarketingNotificationQueryError, parseMarketingCampaignListQuery, parseMarketingDestinationQuery, parseMarketingEstimateQuery } from "@/lib/marketing-notification-query";
import { checkRateLimit } from "@/lib/rate-limit";
import { MarketingNotificationError, MarketingNotificationService } from "@/services/marketing-notifications";
import { Prisma } from "@prisma/client";

function fail(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return errorResponse("Authentication is required.", 401, "UNAUTHENTICATED");
  if (error instanceof AdminAuthorizationError) return errorResponse("Administrative permission denied.", 403, "FORBIDDEN");
  if (error instanceof MarketingNotificationError || error instanceof MarketingNotificationQueryError) {
    const status = error instanceof MarketingNotificationError && error.code === "NOT_FOUND" ? 404 : error instanceof MarketingNotificationError && error.code === "CONFLICT" ? 409 : 400;
    return errorResponse(error.message, status, error instanceof MarketingNotificationError ? error.code : "INVALID_QUERY");
  }
  const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error instanceof Prisma.PrismaClientInitializationError ? error.errorCode : undefined;
  console.error("[marketing-notifications-api] unexpected request failure", { code, error });
  if (["P1001", "P2021", "P2022", "P2024", "P2028"].includes(code ?? "")) return errorResponse("Marketing notifications are temporarily unavailable. Please try again shortly.", 503, "MARKETING_NOTIFICATIONS_UNAVAILABLE");
  return errorResponse("Unable to manage marketing notifications.", 500, "MARKETING_NOTIFICATIONS_ERROR");
}

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    if (query.has("destinations")) return successResponse(await MarketingNotificationService.destinationOptions(parseMarketingDestinationQuery(query)));
    if (query.has("estimate")) return successResponse({ eligibleRecipients: await MarketingNotificationService.audienceEstimate(parseMarketingEstimateQuery(query)) });
    return successResponse(await MarketingNotificationService.adminList(parseMarketingCampaignListQuery(query)));
  } catch (error) { return fail(error); }
}
export async function POST(request: Request) { try { if (!checkRateLimit(`marketing-notification-create:${request.headers.get("x-forwarded-for") ?? "local"}`, 20, 60_000)) return errorResponse("Too many campaign requests.", 429); return successResponse(await MarketingNotificationService.create(await request.json()), 201); } catch (error) { return fail(error); } }
