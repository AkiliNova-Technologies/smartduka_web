import { randomUUID } from "node:crypto";
import { PaymentAttemptStatus, PaymentGateway, PaymentStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma/client";

export class PaymentAttemptError extends Error {
  constructor(
    message: string,
    public readonly code: "ORDER_NOT_FOUND" | "ORDER_ALREADY_PAID" | "INVALID_PAYMENT_AMOUNT",
  ) {
    super(message);
    this.name = "PaymentAttemptError";
  }
}

/** Generates a unique, Pesapal-safe provider-facing reference for one local payment attempt. */
export function createMerchantReference(orderNumber: string) {
  const safeOrderNumber = orderNumber
    .replace(/[^A-Za-z0-9_.:-]/g, "-")
    .slice(0, 33);
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  return `${safeOrderNumber}-P-${suffix}`;
}

/**
 * Persists payment identity and financial snapshots only. Provider communication and
 * payment state transitions intentionally belong to later Phase 3 services.
 */
export class PaymentAttemptService {
  static async createPaymentAttempt(input: {
    orderId: string;
    gateway: PaymentGateway;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        currency: true,
        paymentStatus: true,
      },
    });
    if (!order)
      throw new PaymentAttemptError("Order was not found.", "ORDER_NOT_FOUND");
    if (order.paymentStatus === PaymentStatus.COMPLETED)
      throw new PaymentAttemptError(
        "A completed order cannot start another payment attempt.",
        "ORDER_ALREADY_PAID",
      );

    const amount = new Decimal(order.totalAmount.toString());
    if (!amount.isFinite() || amount.lessThanOrEqualTo(0))
      throw new PaymentAttemptError(
        "Order total must be positive before payment can begin.",
        "INVALID_PAYMENT_AMOUNT",
      );

    return prisma.paymentAttempt.create({
      data: {
        orderId: order.id,
        gateway: input.gateway,
        merchantReference: createMerchantReference(order.orderNumber),
        amount,
        currency: order.currency,
        status: PaymentAttemptStatus.CREATED,
      },
    });
  }
}
