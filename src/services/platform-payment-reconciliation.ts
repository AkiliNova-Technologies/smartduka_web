import { PlatformPaymentIntentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { MtnMomoProvider } from "@/lib/payments/providers/mtn-momo-provider";
import { PlatformPaymentService } from "@/services/platform-payment";
import { VendorPromotionsService } from "@/services/vendor-promotions";
import { VendorSubscriptionService } from "@/services/vendor-subscriptions";
import { PromotionInventoryService } from "@/services/promotion-inventory";

const allowed: Partial<Record<PlatformPaymentIntentStatus, PlatformPaymentIntentStatus[]>> = { CREATED: ["PENDING", "FAILED"], PENDING: ["SUCCESSFUL", "FAILED", "CANCELLED", "EXPIRED"], SUCCESSFUL: ["REVERSED"] };
export class PlatformPaymentReconciliationService {
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
      const intent = await tx.platformPaymentIntent.findUnique({ where: { id }, include: { platformRevenueOrder: { include: { campaign: true, subscription: { include: { vendor: { select: { ownerId: true } } } } } } } });
      if (!intent || !allowed[intent.status]?.includes(next)) return { outcome: "IGNORED_STALE" as const };
      if (Number(intent.amount) !== Number(amount) || intent.currency !== currency) return { outcome: "INVALID_TRANSITION" as const };
      const now = new Date();
      const intentUpdate = await tx.platformPaymentIntent.update({ where: { id }, data: { status: next, lastReconciledAt: now, nextReconcileAt: null, reconcileAttempts: { increment: 1 }, lastReconcileError: null } });
      // Qualification money-movement records must never activate a campaign or
      // subscription, even though reconciliation itself remains canonical.
      if (next === "SUCCESSFUL") {
        await tx.platformRevenueOrder.update({ where: { id: intent.platformRevenueOrderId }, data: { status: "PAID" } });
        if (intent.platformRevenueOrder.qualificationKind !== "NONE") return { outcome: "TRANSITION_APPLIED" as const, intent: intentUpdate };
        const campaign = intent.platformRevenueOrder.campaign;
        if (campaign) await PromotionInventoryService.confirmPaidWithCreditRecovery(tx, campaign, Number(intent.platformRevenueOrder.creditApplied), now);
        const subscription = intent.platformRevenueOrder.subscription;
        if (subscription) { const current = await tx.vendorSubscription.findFirst({ where: { vendorId: intent.vendorId, status: "ACTIVE", currentPeriodEnd: { gt: now } }, orderBy: { currentPeriodEnd: "desc" } }); const start = current?.currentPeriodEnd && current.currentPeriodEnd > now ? current.currentPeriodEnd : now; const future = start > now; await tx.vendorSubscription.update({ where: { id: subscription.id }, data: { status: future ? "PAST_DUE" : "ACTIVE", startedAt: start, currentPeriodStart: start, currentPeriodEnd: VendorSubscriptionService.addMonth(start) } }); await tx.notification.upsert({ where: { idempotencyKey: `subscription:${subscription.id}:${future ? "renewed" : "activated"}` }, update: {}, create: { idempotencyKey: `subscription:${subscription.id}:${future ? "renewed" : "activated"}`, vendorId: intent.vendorId, userId: subscription.vendor.ownerId, type: "INFO", title: future ? "Your subscription has been renewed" : "Your subscription is active", message: future ? `Your next billing period starts ${start.toLocaleDateString("en-UG", { dateStyle: "medium" })}.` : "Your paid subscription is active.", actionPath: "/vendor/subscription" } }); }
      } else if (next === "REVERSED") {
        await tx.platformRevenueOrder.update({ where: { id: intent.platformRevenueOrderId }, data: { status: "REVIEW_REQUIRED" } });
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
