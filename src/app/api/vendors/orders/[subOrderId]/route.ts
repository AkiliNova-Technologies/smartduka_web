import { NextRequest } from "next/server";
import { OrderService } from "@/services/order";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ subOrderId: string }> }
) {
  try {
    const { subOrderId } = await params;
    const { status } = await req.json();

    if (!status) {
      return errorResponse("status is required", 400);
    }

    const updated = await OrderService.updateSubOrderStatus(subOrderId, status);

    return successResponse({ updated: true, status: updated.status });
  } catch (error: unknown) {
    console.error("[Vendor Order Status API]", error);
    return errorResponse(getErrorMessage(error));
  }
}