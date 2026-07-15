import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { OrderService } from "@/services/order";
import { PaymentGateway } from "@prisma/client";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const orders = await OrderService.getUserOrders(userId);
    return successResponse({ orders });
  } catch (error: unknown) {
    console.error("[Orders API GET]", error);
    return errorResponse(getErrorMessage(error));
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await req.json();

    const order = await OrderService.createOrder({
      userId,
      items: body.items,
      shippingAddress: body.shippingAddress,
      shippingPhone: body.shippingPhone,
      shippingEmail: body.shippingEmail || "",
      paymentGateway:
        (body.paymentGateway as PaymentGateway) || "CASH_ON_DELIVERY",
      notes: body.notes,
    });

    return successResponse({ order }, 201);
  } catch (error: unknown) {
    console.error("[Orders API POST]", error);
    return errorResponse(getErrorMessage(error));
  }
}