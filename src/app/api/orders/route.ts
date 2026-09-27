import { NextRequest } from "next/server";
import {
  AccountInactiveError,
  AuthenticationRequiredError,
  requireActiveUserId,
} from "@/lib/auth/session";
import {
  CheckoutError,
  OrderService,
  type CheckoutIntent,
} from "@/services/order";
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from "@/lib/api-utils";

export async function GET() {
  try {
    const userId = await requireActiveUserId();
    const orders = await OrderService.getUserOrders(userId);
    return successResponse({ orders });
  } catch (error: unknown) {
    console.error("[Orders API GET]", error);
    return errorResponse(
      getErrorMessage(error),
      error instanceof AuthenticationRequiredError
        ? 401
        : error instanceof AccountInactiveError
          ? 403
          : 500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireActiveUserId();
    const body = await req.json();

    // Accept intent only. Browser financial, vendor, and identity fields are never forwarded.
    const intent: CheckoutIntent = {
      items: Array.isArray(body.items)
        ? body.items.map(
            (item: { productId: string; variantId?: string | null; quantity: number }) => ({
              productId: item?.productId,
              ...(item?.variantId === undefined ? {} : { variantId: item.variantId }),
              quantity: item?.quantity,
            }),
          )
        : body.items,
      shippingAddress: body.shippingAddress,
      shippingPhone: body.shippingPhone,
      shippingEmail: body.shippingEmail,
      paymentGateway: body.paymentGateway,
      checkoutRequestId: req.headers.get("idempotency-key") || body.checkoutRequestId,
      notes: body.notes,
    };
    const order = await OrderService.createOrder({ userId, ...intent });
    return successResponse({ order }, 201);
  } catch (error: unknown) {
    console.error("[Orders API POST]", error);
    return errorResponse(
      getErrorMessage(error),
      error instanceof AuthenticationRequiredError
        ? 401
        : error instanceof AccountInactiveError
          ? 403
          : error instanceof CheckoutError
            ? error.code === "IDEMPOTENCY_CONFLICT"
              ? 409
              : 400
            : 500,
    );
  }
}
