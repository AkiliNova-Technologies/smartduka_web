import { randomUUID } from "node:crypto";
import { PaymentAttemptStatus, PaymentGateway, PaymentStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma/client";
import { getPesapalConfig } from "@/lib/payments/pesapal/config";
import { PesapalClient, PesapalClientError } from "@/services/payments/pesapal-client";

export class PesapalPaymentError extends Error { constructor(message: string, readonly code: string) { super(message); this.name = "PesapalPaymentError"; } }
export function serializePesapalAmount(amount: Decimal): number { const value = amount.toFixed(2); const numeric = Number(value); if (!Number.isFinite(numeric) || !Number.isSafeInteger(Math.round(numeric * 100))) throw new PesapalPaymentError("Amount is unsupported.", "INVALID_AMOUNT"); return numeric; }
const client = new PesapalClient();
export class PesapalPaymentService {
  static async initiatePayment(input: { authenticatedUserId: string; orderId: string; initiationRequestId: string }) {
    if (!input.orderId || !/^[A-Za-z0-9-]{8,128}$/.test(input.initiationRequestId)) throw new PesapalPaymentError("Invalid payment initiation request.", "INVALID_REQUEST");
    const order = await prisma.order.findFirst({ where: { id: input.orderId, customerId: input.authenticatedUserId }, select: { id:true, orderNumber:true, totalAmount:true, currency:true, paymentGateway:true, paymentStatus:true, status:true, shippingAddress:true, shippingPhone:true, shippingEmail:true } });
    if (!order) throw new PesapalPaymentError("Order unavailable.", "ORDER_UNAVAILABLE");
    if (order.paymentGateway !== PaymentGateway.PESAPAL || order.paymentStatus === PaymentStatus.COMPLETED || order.paymentStatus === PaymentStatus.REVERSED || order.status === "FAILED") throw new PesapalPaymentError("Order cannot be paid.", "ORDER_INELIGIBLE");
    let attempt = await prisma.paymentAttempt.findUnique({ where: { initiationRequestId: input.initiationRequestId } });
    if (attempt) { if (attempt.orderId !== order.id) throw new PesapalPaymentError("Payment request conflict.", "INITIATION_CONFLICT"); if (attempt.status === PaymentAttemptStatus.INITIATED && attempt.redirectUrl) return { orderId: order.id, paymentAttemptId: attempt.id, status: attempt.status, redirectUrl: attempt.redirectUrl }; throw new PesapalPaymentError("Payment requires reconciliation or a fresh initiation key.", "RECONCILIATION_REQUIRED"); }
    const amount = new Decimal(order.totalAmount.toString()); if (!amount.isFinite() || amount.lessThanOrEqualTo(0) || !/^[A-Z]{3}$/.test(order.currency)) throw new PesapalPaymentError("Order cannot be paid.", "ORDER_INELIGIBLE");
    try { attempt = await prisma.paymentAttempt.create({ data: { orderId: order.id, gateway: PaymentGateway.PESAPAL, merchantReference: `${order.orderNumber.replace(/[^A-Za-z0-9_.:-]/g, "-").slice(0,33)}-P-${randomUUID().replaceAll("-", "").slice(0,12).toUpperCase()}`, initiationRequestId: input.initiationRequestId, amount, currency: order.currency, status: PaymentAttemptStatus.CREATED } }); } catch (error: unknown) { if (!(typeof error === "object" && error && "code" in error && error.code === "P2002")) throw error; attempt = await prisma.paymentAttempt.findUnique({ where: { initiationRequestId: input.initiationRequestId } }); if (!attempt || attempt.orderId !== order.id) throw new PesapalPaymentError("Payment request conflict.", "INITIATION_CONFLICT"); throw new PesapalPaymentError("Payment request is already being processed.", "RECONCILIATION_REQUIRED"); }
    const config = getPesapalConfig();
    try {
      const response = await client.submitOrder({ id: attempt.merchantReference, amount: serializePesapalAmount(new Decimal(attempt.amount.toString())), currency: attempt.currency, description: `Payment for SmartDuka order ${order.orderNumber}`.slice(0,100), callback_url: config.callbackUrl, ...(config.cancellationUrl ? { cancellation_url: config.cancellationUrl } : {}), notification_id: config.ipnId, billing_address: { email_address: order.shippingEmail, phone_number: order.shippingPhone, country_code: "UG", first_name: "Customer", last_name: "", line_1: order.shippingAddress } });
      if (response.merchantReference !== attempt.merchantReference) throw new PesapalPaymentError("Provider reference mismatch.", "RECONCILIATION_REQUIRED");
      const updated = await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { providerTrackingId: response.orderTrackingId, redirectUrl: response.redirectUrl, status: PaymentAttemptStatus.INITIATED, initiatedAt: new Date(), providerStatus: "SUBMITTED" } });
      return { orderId: order.id, paymentAttemptId: updated.id, status: updated.status, redirectUrl: response.redirectUrl };
    } catch (error: unknown) {
      const ambiguous = error instanceof PesapalPaymentError || error instanceof PesapalClientError && ["PESAPAL_NETWORK_ERROR", "PESAPAL_INVALID_RESPONSE"].includes(error.code);
      await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: ambiguous ? PaymentAttemptStatus.SUBMISSION_UNKNOWN : PaymentAttemptStatus.FAILED, providerStatus: ambiguous ? "SUBMISSION_UNKNOWN" : "REJECTED" } });
      throw error;
    }
  }
}
