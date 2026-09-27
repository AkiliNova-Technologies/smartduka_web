"use server";

import { PaymentGateway } from "@prisma/client";
import { requireActiveUserId } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api-utils";
import { OrderService, type CheckoutIntent } from "@/services/order";

/** Server Action adapter for the same canonical service used by /api/orders. */
export async function placeOrderAction(input: CheckoutIntent) {
  return withErrorHandling(async () => {
    const userId = await requireActiveUserId();
    return { order: await OrderService.createOrder({ userId, ...input }) };
  }, "placeOrderAction");
}

export type { CheckoutIntent } from "@/services/order";
export { PaymentGateway };
