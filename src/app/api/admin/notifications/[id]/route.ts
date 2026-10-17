import { AdminAuthorizationError } from "@/lib/auth/admin-context";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { AnnouncementError, AnnouncementService } from "@/services/announcements";

const fail = (error: unknown) => errorResponse(getErrorMessage(error), error instanceof AdminAuthorizationError ? 403 : error instanceof AnnouncementError && error.code === "NOT_FOUND" ? 404 : error instanceof AnnouncementError && error.code === "CONFLICT" ? 409 : 400);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return successResponse(await AnnouncementService.update((await params).id, await request.json())); }
  catch (error) { return fail(error); }
}
