import { prisma } from "@/lib/prisma/client";
import { paymentHealth } from "@/services/payment-health";

/** Shared read model for the customer payment-status API and trusted jobs. */
export class PaymentStatusService {
  static async getCustomerOrderPaymentStatus(
    customerId: string,
    orderId: string,
  ) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId },
      select: {
        id: true,
        status: true,
        paymentGateway: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
      },
    });
    if (!order) return null;
    // A direct-payment order may have a completed parent aggregate while its
    // authoritative customer status remains the linked PaymentIntent.
    const legacy = order.paymentGateway === "PESAPAL";
    if (legacy) {
      const status =
        order.paymentStatus === "COMPLETED"
          ? "SUCCEEDED"
          : ["FAILED", "REVERSED"].includes(order.paymentStatus)
            ? "FAILED"
            : "PENDING";
      return {
        orderId,
        paymentStatus: status,
        status,
        orderStatus: order.status,
        provider: null,
        amount: Number(order.totalAmount),
        currency: "UGX",
        providerReference: null,
        updatedAt: order.createdAt,
        canRetry: order.paymentStatus === "FAILED",
      };
    }
    const intent = await prisma.paymentIntent.findFirst({
      where: { orderId },
      orderBy: { updatedAt: "desc" },
      select: {
        status: true,
        provider: true,
        amount: true,
        currency: true,
        providerReference: true,
        updatedAt: true,
        createdAt: true,
        reconcileAttempts: true,
        lastReconcileError: true,
      },
    });
    const paymentStatus = intent?.status ?? "PENDING";
    const health = intent ? paymentHealth(intent) : "HEALTHY";
    const reversed = intent?.status === "REVERSED";
    return {
      orderId,
      paymentStatus,
      status: reversed ? "PAYMENT_EXCEPTION" : paymentStatus,
      orderStatus: order.status,
      provider: intent?.provider ?? null,
      amount: intent ? Number(intent.amount) : Number(order.totalAmount),
      currency: intent?.currency ?? "UGX",
      providerReference: intent?.providerReference ?? null,
      updatedAt: intent?.updatedAt ?? order.createdAt,
      paymentHealth: reversed ? "NEEDS_REVIEW" : health,
      confirmationDelayed:
        health === "CONFIRMATION_DELAYED" ||
        health === "STUCK" ||
        health === "NEEDS_REVIEW",
      canRetry:
        !reversed && ["FAILED", "CANCELLED", "EXPIRED"].includes(paymentStatus),
    };
  }
}
