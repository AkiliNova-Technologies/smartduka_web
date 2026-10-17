import { AdminAuthorizationError } from "@/lib/auth/admin-context";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { AnnouncementError, AnnouncementService } from "@/services/announcements";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return successResponse(await AnnouncementService.cancel((await params).id)); }
  catch (error) { return errorResponse(getErrorMessage(error), error instanceof AdminAuthorizationError ? 403 : error instanceof AnnouncementError && error.code === "CONFLICT" ? 409 : 400); }
}
