import { NextRequest } from "next/server";
import { VendorService } from "@/services/vendor";
import { VerificationStatus } from "@prisma/client";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { AdminAuthorizationError, requireAdminContext } from "@/lib/auth/admin-context";

function adminError(error: unknown) {
  return errorResponse(getErrorMessage(error), error instanceof AuthenticationRequiredError ? 401 : error instanceof AdminAuthorizationError ? 403 : 500);
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminContext("platform:manage_vendors");
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as VerificationStatus | null;
    const search = url.searchParams.get("search") || undefined;
    if (status && !Object.values(VerificationStatus).includes(status)) return errorResponse("Invalid vendor status", 400);
    const applications = await VendorService.getAllApplications({ status: status || undefined, search });
    const rows = applications.map((app) => ({
      id: app.id, storeName: app.storeName, storeSlug: app.storeSlug, businessType: app.businessType,
      businessEmail: app.businessEmail, businessPhone: app.businessPhone, streetAddress: app.streetAddress,
      city: app.city, district: app.district, hasPhysicalStore: app.hasPhysicalStore, status: app.status,
      createdAt: app.createdAt.toISOString(), userName: app.user.name?.trim() || "Unnamed User",
      userEmail: app.user.email, userPhone: app.user.phone, documentCount: app.documents.length,
    }));
    return successResponse({ applications: rows });
  } catch (error: unknown) {
    return adminError(error);
  }
}
