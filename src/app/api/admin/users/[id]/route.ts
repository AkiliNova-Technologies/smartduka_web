import { NextRequest } from "next/server";
import { AdminService } from "@/services/admin";
import { PlatformRole, UserStatus } from "@prisma/client";
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from "@/lib/api-utils";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import {
  AdminAuthorizationError,
  requireAdminContext,
} from "@/lib/auth/admin-context";

function adminError(error: unknown) {
  return errorResponse(
    getErrorMessage(error),
    error instanceof AuthenticationRequiredError
      ? 401
      : error instanceof AdminAuthorizationError
        ? 403
        : 500,
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminContext("platform:customer_support");
    const { id } = await params;
    const user = await AdminService.getUserById(id);
    if (!user) return errorResponse("User not found", 404);
    return successResponse(user);
  } catch (error: unknown) {
    return adminError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdminContext("platform:manage");
    const { id } = await params;
    const body: unknown = await req.json();
    if (!body || typeof body !== "object")
      return errorResponse("Invalid request body", 400);
    const update = body as { platformRole?: unknown; status?: unknown };

    if (update.platformRole !== undefined) {
      if (
        !Object.values(PlatformRole).includes(
          update.platformRole as PlatformRole,
        )
      )
        return errorResponse("Invalid platform role", 400);
      return successResponse(
        await AdminService.updateUserRole(
          id,
          update.platformRole as PlatformRole,
          admin.userId,
        ),
      );
    }
    if (update.status !== undefined) {
      if (!Object.values(UserStatus).includes(update.status as UserStatus))
        return errorResponse("Invalid user status", 400);
      return successResponse(
        await AdminService.updateUserStatus(
          id,
          update.status as UserStatus,
          admin.userId,
        ),
      );
    }
    return errorResponse(
      "No valid update field provided (platformRole or status)",
      400,
    );
  } catch (error: unknown) {
    return adminError(error);
  }
}
