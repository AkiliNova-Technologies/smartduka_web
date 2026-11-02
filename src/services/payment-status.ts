import { prisma } from "@/lib/prisma/client";
import { PaymentProviderRegistry } from "@/lib/payments/payment-provider";
import { paymentHealth } from "@/services/payment-health";

const terminal = new Set(["SUCCESSFUL", "FAILED", "CANCELLED", "EXPIRED", "REVERSED"]);

/** Customer-owned, per-seller payment read model used by mobile polling. */
export class PaymentStatusService {
  static async getCustomerOrderPaymentStatus(customerId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId },
      select: {
        id: true, orderNumber: true, status: true, paymentGateway: true,
        paymentStatus: true, totalAmount: true, currency: true, createdAt: true,
        subOrders: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true, subOrderNumber: true, vendorId: true, vendorTotal: true,
            vendor: { select: { storeName: true, paymentAccounts: { where: { status: "VERIFIED", suspendedAt: null }, select: { provider: true } } } },
            paymentIntents: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, provider: true, amount: true, currency: true, providerReference: true, updatedAt: true, createdAt: true, reconcileAttempts: true, lastReconcileError: true } },
          },
        },
      },
    });
    if (!order) return null;
    if (order.paymentGateway === "PESAPAL") {
      const status = order.paymentStatus === "COMPLETED" ? "SUCCESSFUL" : ["FAILED", "REVERSED"].includes(order.paymentStatus) ? order.paymentStatus : "PENDING";
      return { orderId, orderNumber: order.orderNumber, paymentStatus: status, orderStatus: order.status, amount: Number(order.totalAmount), paidAmount: status === "SUCCESSFUL" ? Number(order.totalAmount) : 0, outstandingAmount: status === "SUCCESSFUL" ? 0 : Number(order.totalAmount), currency: order.currency, updatedAt: order.createdAt, terminal: terminal.has(status), subOrders: [] };
    }
    const subOrders = order.subOrders.map((subOrder) => {
      const intent = subOrder.paymentIntents[0];
      const status = intent?.status ?? "NOT_STARTED";
      const health = (intent ? paymentHealth(intent) : null) ?? "HEALTHY";
      const availableProviders = [...new Set(subOrder.vendor.paymentAccounts.map((account) => account.provider).filter((provider) => PaymentProviderRegistry.getReadiness(provider).customerPaymentsReady))];
      return {
        subOrderId: subOrder.id, subOrderNumber: subOrder.subOrderNumber,
        vendorId: subOrder.vendorId, vendorName: subOrder.vendor.storeName,
        amount: Number(subOrder.vendorTotal), currency: order.currency,
        status, provider: intent?.provider ?? null,
        paymentIntentId: intent?.id ?? null,
        providerReference: intent?.providerReference ? `••••${intent.providerReference.slice(-6)}` : null,
        updatedAt: intent?.updatedAt ?? order.createdAt,
        paymentHealth: status === "REVERSED" ? "NEEDS_REVIEW" : health,
        confirmationDelayed: ["CONFIRMATION_DELAYED", "STUCK", "NEEDS_REVIEW"].includes(health),
        canInitiate: !intent && availableProviders.length > 0,
        canRetry: Boolean(intent && ["FAILED", "CANCELLED", "EXPIRED"].includes(status) && availableProviders.includes(intent.provider)),
        availableProviders,
      };
    });
    const paidAmount = subOrders.filter((entry) => entry.status === "SUCCESSFUL").reduce((sum, entry) => sum + entry.amount, 0);
    const successful = subOrders.filter((entry) => entry.status === "SUCCESSFUL").length;
    const reversed = subOrders.some((entry) => entry.status === "REVERSED");
    const pending = subOrders.some((entry) => ["CREATED", "PENDING", "AUTHORIZED"].includes(entry.status));
    const paymentStatus = reversed ? "PAYMENT_EXCEPTION" : successful === subOrders.length && subOrders.length > 0 ? "SUCCESSFUL" : successful > 0 ? "PARTIALLY_PAID" : pending ? "PENDING" : "NOT_STARTED";
    return { orderId, orderNumber: order.orderNumber, paymentStatus, orderStatus: order.status, amount: Number(order.totalAmount), paidAmount, outstandingAmount: Math.max(0, Number(order.totalAmount) - paidAmount), currency: order.currency, updatedAt: subOrders.reduce((latest, entry) => entry.updatedAt > latest ? entry.updatedAt : latest, order.createdAt), terminal: subOrders.length > 0 && subOrders.every((entry) => terminal.has(entry.status)), subOrders };
  }
}
