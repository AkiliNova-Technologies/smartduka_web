import { AdminAuthorizationError } from "@/lib/auth/admin-context";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { AnnouncementError, AnnouncementService } from "@/services/announcements";

function failure(error: unknown) {
  const status = error instanceof AdminAuthorizationError ? 403 : error instanceof AnnouncementError && error.code === "NOT_FOUND" ? 404 : error instanceof AnnouncementError && error.code === "CONFLICT" ? 409 : 400;
  return errorResponse(getErrorMessage(error), status);
}

export async function GET() {
  try { return successResponse({ announcements: await AnnouncementService.adminList() }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(`announcement-create:${request.headers.get("x-forwarded-for") ?? "local"}`, 20, 60_000)) return errorResponse("Too many announcement requests.", 429);
    return successResponse(await AnnouncementService.create(await request.json()), 201);
  } catch (error) { return failure(error); }
}
