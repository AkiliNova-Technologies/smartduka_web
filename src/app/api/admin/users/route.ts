import { NextRequest } from "next/server";
import { requireRequestRuntime } from "@/lib/next/request-runtime";
import { AdminService } from "@/services/admin";
import { PlatformRole } from "@prisma/client";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { AdminAuthorizationError, requireAdminContext } from "@/lib/auth/admin-context";

function adminError(error: unknown) {
  return errorResponse(getErrorMessage(error), error instanceof AuthenticationRequiredError ? 401 : error instanceof AdminAuthorizationError ? 403 : 500);
}

export async function GET(req: NextRequest) {
  await requireRequestRuntime();
  try {
    await requireAdminContext("platform:customer_support");
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") || undefined;
    const role = searchParams.get("role") as PlatformRole | undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;
    const result = await AdminService.getAllUsers({ search, role, limit, offset });
    return successResponse(result);
  } catch (error: unknown) {
    console.error("[Admin Users API]", error);
    return adminError(error);
  }
}
