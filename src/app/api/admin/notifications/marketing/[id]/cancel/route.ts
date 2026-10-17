import { AdminAuthorizationError } from "@/lib/auth/admin-context";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { MarketingNotificationError, MarketingNotificationService } from "@/services/marketing-notifications";
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) { try { return successResponse(await MarketingNotificationService.cancel((await params).id)); } catch (error) { return errorResponse(getErrorMessage(error), error instanceof AdminAuthorizationError ? 403 : error instanceof MarketingNotificationError && error.code === "CONFLICT" ? 409 : 400); } }
