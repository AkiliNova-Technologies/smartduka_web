import { NextRequest } from "next/server";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { requireVendorContext, VendorAuthorizationError } from "@/lib/auth/vendor-context";
import { OrderService } from "@/services/order";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ subOrderId: string }> },
) {
  try {
    const context = await requireVendorContext("vendor:process_orders");
    const { subOrderId } = await params;
    const { status } = await req.json();

    if (!status) return errorResponse("status is required", 400);

    const updated = await OrderService.updateSubOrderStatus(
      subOrderId,
      status,
      context.vendorId,
    );
    if (!updated) return errorResponse("Order not found", 404);

    return successResponse({ updated: true, status: updated.status });
  } catch (error: unknown) {
    console.error("[Vendor Order Status API]", error);
    return errorResponse(
      getErrorMessage(error),
      error instanceof AuthenticationRequiredError
        ? 401
        : error instanceof VendorAuthorizationError
          ? 403
          : 500,
    );
  }
}
