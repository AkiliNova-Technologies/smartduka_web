import { PlatformPaymentIntentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { MtnMomoProvider } from "@/lib/payments/providers/mtn-momo-provider";
import { PlatformPaymentService } from "@/services/platform-payment";
import { VendorPromotionsService } from "@/services/vendor-promotions";
import { VendorSubscriptionService } from "@/services/vendor-subscriptions";
import { PromotionInventoryService } from "@/services/promotion-inventory";

const allowed: Partial<Record<PlatformPaymentIntentStatus, PlatformPaymentIntentStatus[]>> = { CREATED: ["PENDING", "FAILED"], PENDING: ["SUCCESSFUL", "FAILED", "CANCELLED", "EXPIRED"], SUCCESSFUL: ["REVERSED"] };
type Tx = Prisma.TransactionClient;
export class PlatformPaymentReconciliationService {
  private static async applySubscriptionPayment(tx: Tx, intent: {
    id: string; vendorId: string; amount: Prisma.Decimal; currency: string;
    platformRevenueOrder: { id: string; subscriptionBillingIntent: null | { id: string; subscriptionId: string; lifecycleIntentId: string | null; planVersionId: string; purpose: "INITIAL_SUBSCRIPTION" | "RENEWAL" | "SCHEDULED_PLAN_CHANGE"; expiresAt: Date; merchantDestinationHash: string; paidPeriod: { id: string } | null; subscription: { id: string; status: string; currentPeriodEnd: Date | null }; planVersion: { id: string; planId: string; planCode: string } } };
  }, now: Date) {
    const billing = intent.platformRevenueOrder.subscriptionBillingIntent;
    if (!billing) return null;
    if (billing.paidPeriod) return { outcome: "IGNORED_STALE" as const };
    const lifecycle = billing.lifecycleIntentId ? await tx.subscriptionLifecycleIntent.findUnique({ where: { id: billing.lifecycleIntentId } }) : null;
    const cancelled = billing.subscription.status === "CANCELLED";
    const obsoleteLifecycle = billing.lifecycleIntentId && (!lifecycle || lifecycle.status !== "PENDING");
    if (billing.expiresAt <= now || cancelled || obsoleteLifecycle) {
      const reason = billing.expiresAt <= now ? "VERIFIED_SUCCESS_AFTER_BILLING_EXPIRY" : cancelled ? "VERIFIED_SUCCESS_AFTER_SUBSCRIPTION_CANCELLATION" : "VERIFIED_SUCCESS_FOR_OBSOLETE_LIFECYCLE_INTENT";
      await tx.subscriptionBillingIntent.update({ where: { id: billing.id }, data: { reviewReason: reason } });
      await tx.platformRevenueOrder.update({ where: { id: intent.platformRevenueOrder.id }, data: { status: "REVIEW_REQUIRED" } });
      await tx.auditLog.create({ data: { vendorId: intent.vendorId, action: "SUBSCRIPTION_PAYMENT_REVIEW_REQUIRED", entity: "SubscriptionBillingIntent", entityId: billing.id, newValues: { reason, paymentIntentId: intent.id } } });
      return { outcome: "REVIEW_REQUIRED" as const };
    }
    const latest = await tx.subscriptionPaidPeriod.findFirst({ where: { subscriptionId: billing.subscriptionId, status: { in: ["ACTIVE", "SCHEDULED"] } }, orderBy: { periodEnd: "desc" } });
    const candidates = [now, billing.subscription.currentPeriodEnd, latest?.periodEnd].filter((value): value is Date => Boolean(value));
    const periodStart = new Date(Math.max(...candidates.map(value => value.getTime())));
    const periodEnd = VendorSubscriptionService.addMonth(periodStart);
    const future = periodStart > now;
    const period = await tx.subscriptionPaidPeriod.create({ data: { vendorId: intent.vendorId, subscriptionId: billing.subscriptionId, billingIntentId: billing.id, paymentIntentId: intent.id, planVersionId: billing.planVersionId, status: future ? "SCHEDULED" : "ACTIVE", periodStart, periodEnd, amount: intent.amount, currency: intent.currency, activatedAt: future ? null : now } });
    if (!future) {
      await tx.vendorSubscription.update({ where: { id: billing.subscriptionId }, data: { planId: billing.planVersion.planId, planVersionId: billing.planVersionId, status: "ACTIVE", startedAt: periodStart, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, cancelledAt: null, gracePeriodEndsAt: null } });
      await tx.subscriptionBillingIntent.update({ where: { id: billing.id }, data: { activatedAt: now } });
      if (lifecycle) await tx.subscriptionLifecycleIntent.update({ where: { id: lifecycle.id }, data: { status: "APPLIED", appliedAt: now } });
    }
    await tx.auditLog.create({ data: { vendorId: intent.vendorId, action: future ? "SUBSCRIPTION_PAID_PERIOD_SCHEDULED" : "SUBSCRIPTION_PAID_PERIOD_ACTIVATED", entity: "SubscriptionPaidPeriod", entityId: period.id, newValues: { purpose: billing.purpose, planCode: billing.planVersion.planCode, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString(), paymentIntentId: intent.id } } });
    return { outcome: "TRANSITION_APPLIED" as const, period };
  }
  static async reconcile(id: string) {
    const intent = await prisma.platformPaymentIntent.findUnique({ where: { id } });
    if (!intent || !intent.providerReference || PlatformPaymentService.isTerminal(intent.status)) return { outcome: "IGNORED_STALE" as const };
    try {
      const result = await new MtnMomoProvider(PlatformPaymentService.platformMtnEnvForReconciliation()).getPaymentStatus(intent.providerReference);
      return this.applyTrustedResult(id, result.status as PlatformPaymentIntentStatus, result.amount, result.currency);
    } catch {
      await prisma.platformPaymentIntent.update({ where: { id }, data: { reconcileAttempts: { increment: 1 }, lastReconciledAt: new Date(), nextReconcileAt: new Date(Date.now() + 120_000), lastReconcileError: "Provider confirmation is pending." } });
      return { outcome: "RETRY_SCHEDULED" as const };
    }
  }
  static async applyTrustedResult(id: string, next: PlatformPaymentIntentStatus, amount: string, currency: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`platform-payment:${id}`}))::text AS lock`;
      const intent = await tx.platformPaymentIntent.findUnique({
        where: { id },
        include: {
          platformRevenueOrder: {
            include: {
              campaign: true,
              subscription: { include: { vendor: { select: { ownerId: true } } } },
              subscriptionBillingIntent: {
                include: {
                  paidPeriod: { select: { id: true } },
                  subscription: { select: { id: true, status: true, currentPeriodEnd: true } },
                  planVersion: { select: { id: true, planId: true, planCode: true } },
                },
              },
            },
          },
        },
      });
      if (!intent || !allowed[intent.status]?.includes(next)) return { outcome: "IGNORED_STALE" as const };
      const now = new Date();
      if (next === "SUCCESSFUL" && (Number(intent.amount) !== Number(amount) || intent.currency !== currency || Boolean(intent.platformRevenueOrder.subscriptionBillingIntent && intent.platformRevenueOrder.subscriptionBillingIntent.merchantDestinationHash !== VendorSubscriptionService.merchantDestinationHash()))) {
        const reason = Number(intent.amount) !== Number(amount) ? "AMOUNT_MISMATCH" : intent.currency !== currency ? "CURRENCY_MISMATCH" : "MERCHANT_DESTINATION_MISMATCH";
        const intentUpdate = await tx.platformPaymentIntent.update({ where: { id }, data: { status: next, lastReconciledAt: now, nextReconcileAt: null, reconcileAttempts: { increment: 1 }, lastReconcileError: reason } });
        await tx.platformRevenueOrder.update({ where: { id: intent.platformRevenueOrderId }, data: { status: "REVIEW_REQUIRED" } });
        if (intent.platformRevenueOrder.subscriptionBillingIntent) await tx.subscriptionBillingIntent.update({ where: { id: intent.platformRevenueOrder.subscriptionBillingIntent.id }, data: { reviewReason: reason } });
        await tx.auditLog.create({ data: { vendorId: intent.vendorId, action: "SUBSCRIPTION_PAYMENT_VERIFICATION_FAILED", entity: "PlatformPaymentIntent", entityId: id, newValues: { reason, reportedAmount: amount, reportedCurrency: currency } } });
        return { outcome: "REVIEW_REQUIRED" as const, intent: intentUpdate };
      }
      if (Number(intent.amount) !== Number(amount) || intent.currency !== currency) return { outcome: "INVALID_TRANSITION" as const };
      const intentUpdate = await tx.platformPaymentIntent.update({ where: { id }, data: { status: next, lastReconciledAt: now, nextReconcileAt: null, reconcileAttempts: { increment: 1 }, lastReconcileError: null } });
      // Qualification money-movement records must never activate a campaign or
      // subscription, even though reconciliation itself remains canonical.
      if (next === "SUCCESSFUL") {
        await tx.platformRevenueOrder.update({ where: { id: intent.platformRevenueOrderId }, data: { status: "PAID" } });
        if (intent.platformRevenueOrder.qualificationKind !== "NONE") return { outcome: "TRANSITION_APPLIED" as const, intent: intentUpdate };
        if (intent.platformRevenueOrder.subscriptionBillingIntent) {
          const result = await this.applySubscriptionPayment(tx as unknown as Tx, intent, now);
          return { ...(result ?? { outcome: "TRANSITION_APPLIED" as const }), intent: intentUpdate };
        }
        const campaign = intent.platformRevenueOrder.campaign;
        if (campaign) await PromotionInventoryService.confirmPaidWithCreditRecovery(tx, campaign, Number(intent.platformRevenueOrder.creditApplied), now);
        const subscription = intent.platformRevenueOrder.subscription;
        if (subscription) { const current = await tx.vendorSubscription.findFirst({ where: { vendorId: intent.vendorId, status: "ACTIVE", currentPeriodEnd: { gt: now } }, orderBy: { currentPeriodEnd: "desc" } }); const start = current?.currentPeriodEnd && current.currentPeriodEnd > now ? current.currentPeriodEnd : now; const future = start > now; await tx.vendorSubscription.update({ where: { id: subscription.id }, data: { status: future ? "PAST_DUE" : "ACTIVE", startedAt: start, currentPeriodStart: start, currentPeriodEnd: VendorSubscriptionService.addMonth(start) } }); await tx.notification.upsert({ where: { idempotencyKey: `subscription:${subscription.id}:${future ? "renewed" : "activated"}` }, update: {}, create: { idempotencyKey: `subscription:${subscription.id}:${future ? "renewed" : "activated"}`, vendorId: intent.vendorId, userId: subscription.vendor.ownerId, type: "INFO", title: future ? "Your subscription has been renewed" : "Your subscription is active", message: future ? `Your next billing period starts ${start.toLocaleDateString("en-UG", { dateStyle: "medium" })}.` : "Your paid subscription is active.", actionPath: "/vendor/subscription" } }); }
      } else if (next === "REVERSED") {
        await tx.platformRevenueOrder.update({ where: { id: intent.platformRevenueOrderId }, data: { status: "REVIEW_REQUIRED" } });
        if (intent.platformRevenueOrder.subscriptionBillingIntent) {
          await tx.subscriptionBillingIntent.update({ where: { id: intent.platformRevenueOrder.subscriptionBillingIntent.id }, data: { reviewReason: "VERIFIED_PAYMENT_REVERSED" } });
          await tx.subscriptionPaidPeriod.updateMany({ where: { paymentIntentId: intent.id }, data: { status: "REVIEW_REQUIRED" } });
          await tx.auditLog.create({ data: { vendorId: intent.vendorId, action: "SUBSCRIPTION_PAYMENT_REVERSAL_REVIEW_REQUIRED", entity: "PlatformPaymentIntent", entityId: intent.id } });
        }
        if (intent.platformRevenueOrder.campaign) { await PromotionInventoryService.release(tx, intent.platformRevenueOrder.campaign.id); await tx.promotionCampaign.update({ where: { id: intent.platformRevenueOrder.campaign.id }, data: { status: "REVIEW_REQUIRED", fulfillmentStatus: "RECOVERY_REQUIRED" } }); }
        if (intent.platformRevenueOrder.subscription) { await tx.vendorSubscription.update({ where: { id: intent.platformRevenueOrder.subscription.id }, data: { status: "PAST_DUE" } }); await tx.notification.upsert({ where: { idempotencyKey: `subscription:${intent.platformRevenueOrder.subscription.id}:payment-reversed` }, update: {}, create: { idempotencyKey: `subscription:${intent.platformRevenueOrder.subscription.id}:payment-reversed`, vendorId: intent.vendorId, userId: intent.platformRevenueOrder.subscription.vendor.ownerId, type: "WARNING", title: "Your subscription payment requires review", message: "Your subscription payment was reversed and requires review.", actionPath: "/vendor/subscription" } }); }
      } else {
        await tx.platformRevenueOrder.update({ where: { id: intent.platformRevenueOrderId }, data: { status: next === "EXPIRED" ? "CANCELLED" : "FAILED" } });
        if (intent.platformRevenueOrder.campaign) {
          await PromotionInventoryService.release(tx, intent.platformRevenueOrder.campaign.id, "EXPIRED");
          await tx.promotionCampaign.update({ where: { id: intent.platformRevenueOrder.campaign.id }, data: { status: "PAYMENT_FAILED", fulfillmentStatus: "CANCELLED" } });
          await VendorPromotionsService.releaseCredit(tx, intent.platformRevenueOrder.campaign.id, intent.vendorId, Number(intent.platformRevenueOrder.creditApplied), "PAYMENT_NOT_FUNDED");
        }
        if (intent.platformRevenueOrder.subscription) await tx.notification.upsert({ where: { idempotencyKey: `subscription:${intent.platformRevenueOrder.subscription.id}:payment-failed` }, update: {}, create: { idempotencyKey: `subscription:${intent.platformRevenueOrder.subscription.id}:payment-failed`, vendorId: intent.vendorId, userId: intent.platformRevenueOrder.subscription.vendor.ownerId, type: "WARNING", title: "Your subscription payment failed", message: "Your subscription payment failed.", actionPath: "/vendor/subscription" } });
      }
      return { outcome: "TRANSITION_APPLIED" as const, intent: intentUpdate };
    });
  }
  static async scheduleDue(limit = 50) { const now = new Date(); const due = await prisma.platformPaymentIntent.findMany({ where: { status: "PENDING", providerReference: { not: null }, OR: [{ nextReconcileAt: null }, { nextReconcileAt: { lte: now } }] }, select: { id: true }, take: limit }); return Promise.all(due.map((row) => this.reconcile(row.id))); }
}
