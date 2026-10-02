import { NextRequest } from "next/server";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { requireVendorContext, VendorAuthorizationError } from "@/lib/auth/vendor-context";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";
import { getVendorOrders } from "@/services/vendor-orders";

/** Supports client-side filter changes; authorization precedes every cache access. */
export async function GET(request: NextRequest) {
  try {
    const context = await requireVendorContext("vendor:view_orders");
    const params = new URL(request.url).searchParams;
    return successResponse(await getVendorOrders(context.vendorId, {
      page: Number(params.get("page")) || 1,
      pageSize: Number(params.get("pageSize")) || 10,
      search: params.get("search") || undefined,
      status: params.get("status") || undefined,
    }));
  } catch (error: unknown) {
    return errorResponse(getErrorMessage(error), error instanceof AuthenticationRequiredError ? 401 : error instanceof VendorAuthorizationError ? 403 : 500);
  }
}
