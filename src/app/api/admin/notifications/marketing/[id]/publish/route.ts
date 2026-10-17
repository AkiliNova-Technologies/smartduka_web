import { AdminAuthorizationError } from "@/lib/auth/admin-context";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { MarketingNotificationError, MarketingNotificationService } from "@/services/marketing-notifications";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { try { if (!checkRateLimit(`marketing-notification-publish:${request.headers.get("x-forwarded-for") ?? "local"}`, 10, 60_000)) return errorResponse("Too many publication requests.", 429); return successResponse(await MarketingNotificationService.publish((await params).id)); } catch (error) { return errorResponse(getErrorMessage(error), error instanceof AdminAuthorizationError ? 403 : error instanceof MarketingNotificationError && error.code === "CONFLICT" ? 409 : 400); } }
