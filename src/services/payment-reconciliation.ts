import { createHash } from "node:crypto";
import {
  PaymentIntentStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma/client";
import { MtnMomoProvider } from "@/lib/payments/providers/mtn-momo-provider";

export type NormalizedProviderEvent = {
  paymentIntentId: string;
  provider: PaymentProvider;
  providerReference: string;
  providerEventId?: string;
  eventType: string;
  status: PaymentIntentStatus;
  amount: string;
  currency: string;
  payload: unknown;
};
export type PaymentTimelineEntry = {
  timestamp: Date;
  source: "CALLBACK" | "CRON" | "ADMIN" | "RECONCILIATION";
  provider: PaymentProvider;
  providerReference: string;
  observedStatus: PaymentIntentStatus | null;
  transitionResult: string;
  safeErrorSummary: string | null;
  amount: string | null;
};
export class PaymentReconciliationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}
// A successful payment is final for fulfilment, but not immutable: MTN can
// subsequently report the one legal compensating transition, SUCCESSFUL to
// REVERSED. Keep it eligible for trusted provider rechecks.
const terminal = new Set<PaymentIntentStatus>([
  "FAILED",
  "CANCELLED",
  "EXPIRED",
  "REVERSED",
]);
const allowed: Partial<Record<PaymentIntentStatus, PaymentIntentStatus[]>> = {
  CREATED: ["PENDING", "FAILED"],
  PENDING: ["SUCCESSFUL", "FAILED", "CANCELLED", "EXPIRED"],
  SUCCESSFUL: ["REVERSED"],
};
const delay = (attempt: number) => Math.min(60, 2 ** Math.min(attempt, 6));
const CLAIM_LEASE_MS = 2 * 60_000;
const PENDING_RECHECK_MS = 2 * 60_000;
const sourceForEvent = (eventType: string): PaymentTimelineEntry["source"] =>
  eventType.includes("CALLBACK")
    ? "CALLBACK"
    : eventType.includes("ADMIN")
      ? "ADMIN"
      : eventType.includes("POLL")
        ? "CRON"
        : "RECONCILIATION";
const maskReference = (reference: string | null) =>
  reference ? `••••${reference.slice(-6)}` : "Unavailable";

/** The sole mutation boundary for direct-payment provider facts. */
export class PaymentReconciliationService {
  static async reconcilePaymentIntent(
    paymentIntentId: string,
    eventType = "PROVIDER_STATUS_POLL",
  ) {
    const intent = await prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      select: {
        id: true,
        status: true,
        providerReference: true,
        provider: true,
      },
    });
    if (!intent)
      throw new PaymentReconciliationError(
        "Payment intent was not found.",
        "NOT_FOUND",
      );
    if (terminal.has(intent.status) || !intent.providerReference)
      return { outcome: "SKIPPED" as const };
    try {
      // Providers remain adapters only: their result always crosses the event
      // ledger and this reconciliation boundary before any intent can change.
      const result =
        intent.provider === PaymentProvider.MTN_MOMO
          ? await new MtnMomoProvider().getPaymentStatus(
              intent.providerReference,
            )
          : null;
      if (!result) {
        await this.markReconcileFailure(
          intent.id,
          `${intent.provider} status polling is not configured.`,
        );
        return { outcome: "RETRY_SCHEDULED" as const };
      }
      return await this.applyProviderResult({
        paymentIntentId: intent.id,
        provider: intent.provider,
        providerReference: intent.providerReference,
        providerEventId: result.providerTransactionId,
        eventType,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        payload: {
          providerReference: result.providerReference,
          status: result.status,
          amount: result.amount,
          currency: result.currency,
          providerTransactionId: result.providerTransactionId ?? null,
        },
      });
    } catch (error) {
      await this.markReconcileFailure(
        intent.id,
        error instanceof Error
          ? error.message
          : "Provider status lookup failed.",
      );
      return { outcome: "RETRY_SCHEDULED" as const };
    }
  }
  static async scheduleDue(limit = 50) {
    const now = new Date();
    const due = await prisma.paymentIntent.findMany({
      where: {
        status: "PENDING",
        providerReference: { not: null },
        OR: [{ nextReconcileAt: null }, { nextReconcileAt: { lte: now } }],
      },
      select: { id: true },
      take: Math.min(Math.max(limit, 1), 100),
      orderBy: { nextReconcileAt: "asc" },
    });
    // `nextReconcileAt` doubles as a short database-backed lease.  Each
    // worker must win this conditional update before contacting the provider;
    // an interrupted worker becomes eligible again once the lease expires.
    return Promise.all(
      due.map(async (intent) => {
        const claimed = await prisma.paymentIntent.updateMany({
          where: {
            id: intent.id,
            status: "PENDING",
            providerReference: { not: null },
            OR: [{ nextReconcileAt: null }, { nextReconcileAt: { lte: now } }],
          },
          data: { nextReconcileAt: new Date(now.getTime() + CLAIM_LEASE_MS) },
        });
        if (!claimed.count) return { outcome: "CLAIM_NOT_ACQUIRED" as const };
        return this.reconcilePaymentIntent(intent.id);
      }),
    );
  }
  static async applyProviderResult(event: NormalizedProviderEvent) {
    const payloadHash = createHash("sha256")
      .update(JSON.stringify(event.payload))
      .digest("hex");
    let amount: Decimal;
    try {
      amount = new Decimal(event.amount);
    } catch {
      throw new PaymentReconciliationError(
        "Provider amount is invalid.",
        "MISMATCH",
      );
    }
    return prisma.$transaction(async (tx) => {
      const intent = await tx.paymentIntent.findUnique({
        where: { id: event.paymentIntentId },
        include: {
          vendor: { select: { ownerId: true, storeName: true } },
          order: { select: { customerId: true } },
        },
      });
      if (
        !intent ||
        intent.provider !== event.provider ||
        intent.providerReference !== event.providerReference
      )
        throw new PaymentReconciliationError(
          "Provider reference mismatch.",
          "MISMATCH",
        );
      if (
        !amount.isFinite() ||
        !amount.equals(intent.amount) ||
        event.currency.toUpperCase() !== intent.currency.toUpperCase()
      )
        throw new PaymentReconciliationError(
          "Provider amount or currency mismatch.",
          "MISMATCH",
        );
      try {
        await tx.paymentProviderEvent.create({
          data: {
            paymentIntentId: intent.id,
            provider: event.provider,
            providerReference: event.providerReference,
            providerEventId: event.providerEventId,
            eventType: event.eventType,
            normalizedStatus: event.status,
            payloadHash,
            processingResult: "RECEIVED",
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
          return { outcome: "DUPLICATE" as const, status: intent.status };
        throw error;
      }
      await tx.auditLog.create({
        data: {
          vendorId: intent.vendorId,
          action: "PAYMENT_PROVIDER_EVENT_RECEIVED",
          entity: "PaymentProviderEvent",
          entityId: intent.id,
          newValues: {
            provider: event.provider,
            eventType: event.eventType,
            normalizedStatus: event.status,
          },
        },
      });
      // PENDING is a provider observation, not a terminal transition.  Keep
      // it auditable and schedule a later poll without emitting any customer,
      // vendor, parent-order, or fulfillment side effect.
      if (
        intent.status === PaymentIntentStatus.PENDING &&
        event.status === PaymentIntentStatus.PENDING
      ) {
        const now = new Date();
        await tx.paymentIntent.updateMany({
          where: { id: intent.id, status: PaymentIntentStatus.PENDING },
          data: {
            lastReconciledAt: now,
            nextReconcileAt: new Date(now.getTime() + PENDING_RECHECK_MS),
            lastReconcileError: null,
          },
        });
        await tx.paymentProviderEvent.update({
          where: {
            provider_payloadHash: { provider: event.provider, payloadHash },
          },
          data: { processingResult: "PENDING_RECORDED", processedAt: now },
        });
        return {
          outcome: "PENDING_RECORDED" as const,
          status: PaymentIntentStatus.PENDING,
        };
      }
      const legal = allowed[intent.status]?.includes(event.status) ?? false;
      if (!legal) {
        const alreadyApplied = intent.status === event.status;
        await tx.paymentProviderEvent.update({
          where: {
            provider_payloadHash: { provider: event.provider, payloadHash },
          },
          data: {
            processingResult: alreadyApplied
              ? "ALREADY_APPLIED"
              : "INVALID_TRANSITION",
            processedAt: new Date(),
            failureReason: alreadyApplied
              ? `State ${event.status} was already applied`
              : `Illegal transition ${intent.status} -> ${event.status}`,
          },
        });
        if (!alreadyApplied)
          await tx.auditLog.create({
            data: {
              vendorId: intent.vendorId,
              action: "PAYMENT_PROVIDER_STATE_CONFLICT",
              entity: "PaymentIntent",
              entityId: intent.id,
              newValues: {
                currentStatus: intent.status,
                observedStatus: event.status,
                provider: event.provider,
              },
            },
          });
        return alreadyApplied
          ? { outcome: "ALREADY_APPLIED" as const, status: intent.status }
          : { outcome: "INVALID_TRANSITION" as const, status: intent.status };
      }
      const now = new Date();
      const won = await tx.paymentIntent.updateMany({
        where: { id: intent.id, status: intent.status },
        data: {
          status: event.status,
          confirmedAt: event.status === "SUCCESSFUL" ? now : intent.confirmedAt,
          failedAt: ["FAILED", "CANCELLED", "EXPIRED"].includes(event.status)
            ? now
            : intent.failedAt,
          lastReconciledAt: now,
          nextReconcileAt: null,
          lastReconcileError: null,
        },
      });
      if (!won.count) {
        // A concurrent worker won the conditional transition.  Record this
        // independent provider observation, but never repeat its side effects.
        const current = await tx.paymentIntent.findUniqueOrThrow({
          where: { id: intent.id },
          select: { status: true },
        });
        const alreadyApplied = current.status === event.status;
        await tx.paymentProviderEvent.update({
          where: {
            provider_payloadHash: { provider: event.provider, payloadHash },
          },
          data: {
            processingResult: alreadyApplied
              ? "ALREADY_APPLIED"
              : "INVALID_TRANSITION",
            processedAt: now,
            failureReason: alreadyApplied
              ? `State ${event.status} was applied by another reconciler`
              : `Concurrent terminal conflict: current ${current.status}, observed ${event.status}`,
          },
        });
        if (!alreadyApplied)
          await tx.auditLog.create({
            data: {
              vendorId: intent.vendorId,
              action: "PAYMENT_PROVIDER_STATE_CONFLICT",
              entity: "PaymentIntent",
              entityId: intent.id,
              newValues: {
                currentStatus: current.status,
                observedStatus: event.status,
                provider: event.provider,
              },
            },
          });
        return alreadyApplied
          ? { outcome: "ALREADY_APPLIED" as const, status: current.status }
          : { outcome: "IGNORED_STALE" as const, status: current.status };
      }
      await tx.paymentProviderEvent.update({
        where: {
          provider_payloadHash: { provider: event.provider, payloadHash },
        },
        data: { processingResult: "TRANSITION_APPLIED", processedAt: now },
      });
      await tx.auditLog.create({
        data: {
          vendorId: intent.vendorId,
          action: "PAYMENT_INTENT_RECONCILED",
          entity: "PaymentIntent",
          entityId: intent.id,
          newValues: {
            oldStatus: intent.status,
            newStatus: event.status,
            provider: event.provider,
          },
        },
      });
      if (event.status === "SUCCESSFUL") {
        const total = await tx.subOrder.count({
          where: { orderId: intent.orderId },
        });
        const successful = await tx.paymentIntent.count({
          where: { orderId: intent.orderId, status: "SUCCESSFUL" },
        });
        if (total === successful)
          await tx.order.updateMany({
            where: { id: intent.orderId, paymentStatus: PaymentStatus.PENDING },
            data: { paymentStatus: PaymentStatus.COMPLETED },
          });
        await tx.notification.createMany({
          skipDuplicates: true,
          data: [
            {
              idempotencyKey: `payment:${intent.id}:successful:customer`,
              userId: intent.order.customerId,
              type: "SUCCESS",
              title: "Payment confirmed",
              message: `Your payment to ${intent.vendor.storeName} was confirmed.`,
            },
            {
              idempotencyKey: `payment:${intent.id}:successful:vendor`,
              vendorId: intent.vendorId,
              userId: intent.vendor.ownerId,
              type: "PAYMENT_RECEIVED",
              title: "Customer payment confirmed",
              message: `A customer payment for ${intent.vendor.storeName} was confirmed.`,
            },
          ],
        });
      }
      if (event.status === "REVERSED") {
        await tx.order.updateMany({
          where: { id: intent.orderId, paymentStatus: PaymentStatus.COMPLETED },
          data: { paymentStatus: PaymentStatus.REVERSED },
        });
        await tx.auditLog.create({
          data: {
            vendorId: intent.vendorId,
            action: "PAYMENT_REVERSAL_NEEDS_REVIEW",
            entity: "PaymentIntent",
            entityId: intent.id,
            newValues: {
              provider: event.provider,
              orderId: intent.orderId,
              subOrderId: intent.subOrderId,
              fulfillmentPreserved: true,
            },
          },
        });
        await tx.notification.createMany({
          skipDuplicates: true,
          data: [
            {
              idempotencyKey: `payment:${intent.id}:reversed:customer`,
              userId: intent.order.customerId,
              type: "WARNING",
              title: "Payment reversed — review required",
              message:
                "There is an issue with this payment and it is being reviewed. Do not pay again yet.",
            },
            {
              idempotencyKey: `payment:${intent.id}:reversed:vendor`,
              vendorId: intent.vendorId,
              userId: intent.vendor.ownerId,
              type: "WARNING",
              title: "Payment reversed — review required",
              message: `A customer payment for ${intent.vendor.storeName} was reversed. Preserve fulfillment history and contact support before proceeding.`,
            },
          ],
        });
      } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(event.status))
        await tx.notification.create({
          data: {
            userId: intent.order.customerId,
            type: "ERROR",
            title: "Payment was not completed",
            message: "Your order remains awaiting payment.",
          },
        });
      return { outcome: "TRANSITION_APPLIED" as const, status: event.status };
    });
  }
  static async timeline(
    paymentIntentId: string,
  ): Promise<PaymentTimelineEntry[]> {
    const events = await prisma.paymentProviderEvent.findMany({
      where: { paymentIntentId },
      orderBy: { receivedAt: "asc" },
      select: {
        receivedAt: true,
        eventType: true,
        provider: true,
        providerReference: true,
        normalizedStatus: true,
        processingResult: true,
        failureReason: true,
        paymentIntent: { select: { amount: true } },
      },
    });
    return events.map((event) => ({
      timestamp: event.receivedAt,
      source: sourceForEvent(event.eventType),
      provider: event.provider,
      providerReference: maskReference(event.providerReference),
      observedStatus: event.normalizedStatus,
      transitionResult: event.processingResult,
      safeErrorSummary: event.failureReason,
      amount: event.paymentIntent.amount.toFixed(2),
    }));
  }
  static async markReconcileFailure(paymentIntentId: string, message: string) {
    const intent = await prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      select: { reconcileAttempts: true, status: true },
    });
    if (!intent || terminal.has(intent.status)) return;
    const attempts = intent.reconcileAttempts + 1;
    await prisma.paymentIntent.update({
      where: { id: paymentIntentId },
      data: {
        reconcileAttempts: attempts,
        lastReconciledAt: new Date(),
        lastReconcileError: message.slice(0, 300),
        nextReconcileAt: new Date(Date.now() + delay(attempts) * 60_000),
      },
    });
  }
}
