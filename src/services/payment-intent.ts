import { randomUUID } from "node:crypto";
import {
  PaymentIntentStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma/client";
import { PaymentEligibilityService } from "@/services/payment-eligibility";
import { PaymentProviderRegistry } from "@/lib/payments/payment-provider";
import { PaymentReconciliationService } from "@/services/payment-reconciliation";
import {
  MtnMomoProvider,
  MtnMomoProviderError,
  getMtnMomoConfig,
} from "@/lib/payments/providers/mtn-momo-provider";

export class PaymentIntentError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

/**
 * Server-only direct-payment orchestration.  It creates one intent per vendor
 * sub-order; no intent can ever represent funds for multiple merchants.
 */
export class PaymentIntentService {
  static async initiateForCustomer(input: {
    customerId: string;
    orderId: string;
    subOrderId: string;
    provider: PaymentProvider;
    idempotencyKey: string;
    payerPhone?: string;
  }) {
    return this.initiate(input, false);
  }

  /** Trusted CLI-only entry point for a real sandbox qualification. */
  static async initiateSandboxQualification(input: {
    customerId: string;
    orderId: string;
    subOrderId: string;
    provider: PaymentProvider;
    idempotencyKey: string;
    payerPhone?: string;
  }) {
    const config = getMtnMomoConfig();
    if (
      input.provider !== PaymentProvider.MTN_MOMO ||
      config.environment !== "sandbox" ||
      !config.sandboxTesting ||
      config.directVendorRoutingVerified
    )
      throw new PaymentIntentError(
        "Sandbox payment qualification is not enabled.",
        "INELIGIBLE",
      );
    return this.initiate(input, true);
  }

  private static async initiate(
    input: {
      customerId: string;
      orderId: string;
      subOrderId: string;
      provider: PaymentProvider;
      idempotencyKey: string;
      payerPhone?: string;
    },
    sandboxQualification: boolean,
  ) {
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(input.idempotencyKey))
      throw new PaymentIntentError(
        "A valid payment request ID is required.",
        "INVALID_REQUEST",
      );
    if (!sandboxQualification)
      PaymentProviderRegistry.assertCustomerPaymentsReady(input.provider);
    const subOrder = await prisma.subOrder.findFirst({
      where: {
        id: input.subOrderId,
        orderId: input.orderId,
        order: { customerId: input.customerId },
      },
      include: {
        order: {
          select: {
            id: true,
            currency: true,
            paymentStatus: true,
            status: true,
            shippingPhone: true,
          },
        },
      },
    });
    if (!subOrder)
      throw new PaymentIntentError(
        "Order payment is unavailable.",
        "NOT_FOUND",
      );
    if (subOrder.order.paymentStatus === PaymentStatus.COMPLETED)
      throw new PaymentIntentError(
        "This order is already paid.",
        "ALREADY_PAID",
      );
    const eligibility = await PaymentEligibilityService.canAcceptPayments(
      subOrder.vendorId,
      input.provider,
      { sandboxQualification },
    );
    if (!eligibility.eligible || !eligibility.accountId)
      throw new PaymentIntentError(
        "This shop cannot accept the selected payment method.",
        eligibility.reasons[0] ?? "INELIGIBLE",
      );
    const pending = await prisma.paymentIntent.findFirst({
      where: { subOrderId: subOrder.id, status: PaymentIntentStatus.PENDING },
      orderBy: { createdAt: "desc" },
    });
    if (pending) {
      // A prior request may have completed after the customer left the page.
      // Reconcile it before ever inviting a second RequestToPay.
      await PaymentReconciliationService.reconcilePaymentIntent(pending.id);
      const refreshed = await prisma.paymentIntent.findUnique({
        where: { id: pending.id },
        select: { status: true },
      });
      if (refreshed?.status === PaymentIntentStatus.SUCCESSFUL)
        throw new PaymentIntentError(
          "This order is already paid.",
          "ALREADY_PAID",
        );
      if (refreshed?.status === PaymentIntentStatus.PENDING)
        throw new PaymentIntentError(
          "A payment for this seller is already awaiting confirmation. Do not pay again yet.",
          "PAYMENT_ALREADY_PENDING",
        );
    }
    const reversed = await prisma.paymentIntent.findFirst({
      where: { subOrderId: subOrder.id, status: PaymentIntentStatus.REVERSED },
      select: { id: true },
    });
    if (reversed)
      throw new PaymentIntentError(
        "This payment was reversed and requires review. Do not pay again yet.",
        "PAYMENT_REVIEW_REQUIRED",
      );
    const amount = new Decimal(subOrder.vendorTotal.toString());
    if (!amount.isFinite() || amount.lessThanOrEqualTo(0))
      throw new PaymentIntentError(
        "Order amount is invalid.",
        "INVALID_AMOUNT",
      );
    const prior = await prisma.paymentIntent.findUnique({
      where: {
        subOrderId_idempotencyKey: {
          subOrderId: subOrder.id,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (prior) {
      if (prior.provider !== input.provider)
        throw new PaymentIntentError(
          "Payment request conflicts with an existing request.",
          "IDEMPOTENCY_CONFLICT",
        );
      return prior;
    }
    let createdIntentId: string | undefined;
    try {
      const providerReference = randomUUID();
      const intent = await prisma.paymentIntent.create({
        data: {
          orderId: subOrder.order.id,
          subOrderId: subOrder.id,
          vendorId: subOrder.vendorId,
          vendorPaymentAccountId: eligibility.accountId,
          provider: input.provider,
          amount,
          currency: subOrder.order.currency,
          idempotencyKey: input.idempotencyKey,
          status: PaymentIntentStatus.PENDING,
          providerReference,
          initiatedAt: new Date(),
        },
      });
      createdIntentId = intent.id;
      await prisma.auditLog.create({
        data: {
          vendorId: subOrder.vendorId,
          action: "PAYMENT_INTENT_CREATED",
          entity: "PaymentIntent",
          entityId: intent.id,
          newValues: {
            provider: input.provider,
            amount: amount.toFixed(2),
            currency: subOrder.order.currency,
          },
        },
      });
      if (input.provider === PaymentProvider.MTN_MOMO) {
        await new MtnMomoProvider().initiatePayment({
          reference: providerReference,
          amount: amount.toFixed(2),
          currency: subOrder.order.currency,
          payerPhone: input.payerPhone ?? subOrder.order.shippingPhone,
          merchantAccount: {},
        });
        await prisma.auditLog.create({
          data: {
            vendorId: subOrder.vendorId,
            action: "PAYMENT_REQUEST_ACCEPTED",
            entity: "PaymentIntent",
            entityId: intent.id,
            newValues: {
              provider: input.provider,
              providerReferenceSuffix: providerReference.slice(-6),
            },
          },
        });
      }
      return intent;
    } catch (error) {
      if (error instanceof MtnMomoProviderError) {
        if (!createdIntentId) throw error;
        if (
          error.code === "SUBMISSION_UNKNOWN" ||
          error.code === "RATE_LIMITED"
        ) {
          await PaymentReconciliationService.markReconcileFailure(
            createdIntentId,
            error.message,
          );
          throw new PaymentIntentError(
            "We are confirming whether MTN received this request. Do not pay again yet.",
            "PAYMENT_CONFIRMATION_PENDING",
          );
        }
        if (
          [
            "REQUEST_REJECTED",
            "INVALID_REQUEST",
            "AUTHENTICATION_FAILED",
          ].includes(error.code)
        ) {
          await prisma.paymentIntent.update({
            where: { id: createdIntentId },
            data: {
              status: PaymentIntentStatus.FAILED,
              failedAt: new Date(),
              failureCode: error.code,
              failureMessage: error.message.slice(0, 300),
              nextReconcileAt: null,
            },
          });
          await prisma.auditLog.create({
            data: {
              vendorId: subOrder.vendorId,
              action: "PAYMENT_REQUEST_REJECTED",
              entity: "PaymentIntent",
              entityId: createdIntentId,
              newValues: { provider: input.provider, reason: error.code },
            },
          });
          throw new PaymentIntentError(
            "The payment could not be completed. Check your Mobile Money details and try again.",
            "PAYMENT_FAILED",
          );
        }
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const winner = await prisma.paymentIntent.findUnique({
          where: {
            subOrderId_idempotencyKey: {
              subOrderId: subOrder.id,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (winner?.provider === input.provider) return winner;
        throw new PaymentIntentError(
          "Payment request conflicts with an existing request.",
          "IDEMPOTENCY_CONFLICT",
        );
      }
      throw error;
    }
  }

  /** Trusted provider callbacks/reconciliation only.  This is intentionally not exposed to clients. */
  static async confirmProviderResult(input: {
    paymentIntentId: string;
    provider: PaymentProvider;
    providerReference: string;
    amount: string;
    currency: string;
    status: "SUCCESSFUL" | "FAILED" | "REVERSED";
    eventType: string;
    payload: unknown;
  }) {
    return PaymentReconciliationService.applyProviderResult(input);
  }
}
