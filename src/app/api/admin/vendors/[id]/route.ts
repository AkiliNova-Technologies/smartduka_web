import { NextRequest } from "next/server";
import { VendorService } from "@/services/vendor";
import { VerificationStatus } from "@prisma/client";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { AdminAuthorizationError, requireAdminContext } from "@/lib/auth/admin-context";

function adminError(error: unknown) {
  return errorResponse(getErrorMessage(error), error instanceof AuthenticationRequiredError ? 401 : error instanceof AdminAuthorizationError ? 403 : 500);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminContext("platform:manage_vendors");
    const { id } = await params;
    if (!id) return errorResponse("Vendor ID is required.", 400);
    const body: unknown = await req.json();
    if (!body || typeof body !== "object") return errorResponse("Invalid request body", 400);
    const { status, reviewerNotes } = body as { status?: unknown; reviewerNotes?: unknown };
    if (!status || !Object.values(VerificationStatus).includes(status as VerificationStatus)) {
      return errorResponse(`Invalid status. Must be one of: ${Object.values(VerificationStatus).join(", ")}`, 400);
    }
    if (reviewerNotes !== undefined && typeof reviewerNotes !== "string") return errorResponse("Invalid reviewer notes", 400);
    const application = await VendorService.updateApplicationStatus(id, status as VerificationStatus, reviewerNotes as string | undefined, admin.userId);
    return successResponse({ application });
  } catch (error: unknown) {
    console.error("Vendor status update error:", error);
    return adminError(error);
  }
}
