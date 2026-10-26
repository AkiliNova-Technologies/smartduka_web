import { Prisma, VendorTrialStatus, type SubscriptionLifecycleIntentType } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { requireVendorContext, VendorAuthorizationError } from "@/lib/auth/vendor-context";
import { requireAdminContext } from "@/lib/auth/admin-context";
import { REVENUE_POLICY_VERSION, TRIAL_POLICY } from "@/lib/revenue/entitlement-policy";

type Tx = Prisma.TransactionClient;
const DAY = 86_400_000;
const lock = (tx: Tx, vendorId: string) => tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`subscription-lifecycle:${vendorId}`}))::text AS lock`;
const ownerContext = async () => { const context = await requireVendorContext("vendor:manage_shop"); if (context.vendorRole !== "OWNER") throw new VendorAuthorizationError("Only the shop owner can manage subscriptions."); return context; };
const audit = (tx: Tx, input: { vendorId: string; userId: string; action: string; entity: string; entityId: string; values?: Prisma.InputJsonValue }) => tx.auditLog.create({ data: { vendorId: input.vendorId, userId: input.userId, action: input.action, entity: input.entity, entityId: input.entityId, newValues: input.values } });

export class VendorSubscriptionLifecycleError extends Error { constructor(message: string, public code: string) { super(message); } }

export class VendorSubscriptionLifecycleService {
  static async activateTrial(idempotencyKey: string, now = new Date()) {
    const context = await ownerContext();
    return prisma.$transaction(async rawTx => {
      const tx = rawTx as unknown as Tx;
      await lock(tx, context.vendorId);
      const vendor = await tx.vendorProfile.findUniqueOrThrow({ where: { id: context.vendorId }, include: { vendorApplication: { select: { status: true } }, trial: true, subscriptions: { select: { id: true, status: true, revenueOrder: { select: { status: true } } } } } });
      if (vendor.trial?.activationKey === idempotencyKey) return vendor.trial;
      const hasPriorPaidAccess = vendor.subscriptions.some(subscription => subscription.revenueOrder?.status === "PAID" || ["ACTIVE", "CANCELLED", "EXPIRED"].includes(subscription.status));
      if (vendor.trial?.activatedAt || vendor.trial?.status === VendorTrialStatus.EXPIRED || vendor.trial?.status === VendorTrialStatus.CANCELLED || hasPriorPaidAccess) throw new VendorSubscriptionLifecycleError("The introductory trial has already been consumed or is no longer available.", "TRIAL_ALREADY_CONSUMED");
      const eligible = vendor.status === "ACTIVE" && !vendor.deletedAt && vendor.vendorApplication?.status === "APPROVED" && vendor.verificationStatus === "VERIFIED";
      if (!eligible) throw new VendorSubscriptionLifecycleError("Shop approval and verification are required before starting a trial.", "TRIAL_NOT_ELIGIBLE");
      const expiresAt = new Date(now.getTime() + TRIAL_POLICY.durationDays * DAY);
      const trial = vendor.trial
        ? await tx.vendorTrial.update({ where: { id: vendor.trial.id }, data: { status: "ACTIVE", eligible: true, eligibilityDeterminedAt: now, activatedAt: now, expiresAt, policyVersion: REVENUE_POLICY_VERSION, activationKey: idempotencyKey } })
        : await tx.vendorTrial.create({ data: { vendorId: vendor.id, status: "ACTIVE", eligible: true, eligibilityDeterminedAt: now, activatedAt: now, expiresAt, policyVersion: REVENUE_POLICY_VERSION, activationKey: idempotencyKey } });
      await tx.vendorProfile.update({ where: { id: vendor.id }, data: { trialStartedAt: now, trialEndsAt: expiresAt } });
      await audit(tx, { vendorId: vendor.id, userId: context.user.id, action: "TRIAL_ACTIVATED", entity: "VendorTrial", entityId: trial.id, values: { policyVersion: REVENUE_POLICY_VERSION, expiresAt: expiresAt.toISOString() } });
      return trial;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  static async extendTrialForAdmin(vendorId: string, newExpiresAt: Date, reason: string) {
    const actor = await requireAdminContext("platform:manage_billing");
    if (!reason.trim()) throw new VendorSubscriptionLifecycleError("An extension reason is required.", "REASON_REQUIRED");
    return prisma.$transaction(async rawTx => {
      const tx = rawTx as unknown as Tx;
      await lock(tx, vendorId);
      const trial = await tx.vendorTrial.findUnique({ where: { vendorId } });
      if (!trial?.expiresAt || newExpiresAt <= trial.expiresAt) throw new VendorSubscriptionLifecycleError("The new trial expiry must be later than the current expiry.", "INVALID_TRIAL_EXTENSION");
      const extension = await tx.vendorTrialExtension.create({ data: { trialId: trial.id, previousExpiresAt: trial.expiresAt, newExpiresAt, reason: reason.trim(), extendedById: actor.userId } });
      await tx.vendorTrial.update({ where: { id: trial.id }, data: { status: "ACTIVE", expiresAt: newExpiresAt } });
      await tx.vendorProfile.update({ where: { id: vendorId }, data: { trialEndsAt: newExpiresAt } });
      await audit(tx, { vendorId, userId: actor.userId, action: "TRIAL_EXTENDED", entity: "VendorTrial", entityId: trial.id, values: { extensionId: extension.id, newExpiresAt: newExpiresAt.toISOString(), reason: reason.trim() } });
      return extension;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private static async currentPaid(tx: Tx, vendorId: string, now: Date) {
    const subscription = await tx.vendorSubscription.findFirst({ where: { vendorId, status: { in: ["ACTIVE", "CANCELLED"] }, currentPeriodEnd: { gt: now }, revenueOrder: { status: "PAID" } }, include: { plan: true, planVersion: true }, orderBy: { currentPeriodEnd: "desc" } });
    if (!subscription?.currentPeriodEnd) throw new VendorSubscriptionLifecycleError("An effective paid subscription is required.", "ACTIVE_SUBSCRIPTION_REQUIRED");
    return subscription;
  }

  static async establishRenewalEligibility(idempotencyKey: string, now = new Date()) {
    const context = await ownerContext();
    return prisma.$transaction(async rawTx => {
      const tx = rawTx as unknown as Tx;
      await lock(tx, context.vendorId);
      const retry = await tx.subscriptionLifecycleIntent.findUnique({ where: { vendorId_idempotencyKey: { vendorId: context.vendorId, idempotencyKey } } }); if (retry) return retry;
      const subscription = await this.currentPaid(tx, context.vendorId, now);
      const existing = await tx.subscriptionLifecycleIntent.findFirst({ where: { subscriptionId: subscription.id, type: "RENEWAL", status: "PENDING" } }); if (existing) return existing;
      const intent = await tx.subscriptionLifecycleIntent.create({ data: { vendorId: context.vendorId, subscriptionId: subscription.id, type: "RENEWAL", effectiveAt: subscription.currentPeriodEnd!, idempotencyKey, requestedById: context.user.id } });
      await audit(tx, { vendorId: context.vendorId, userId: context.user.id, action: "SUBSCRIPTION_RENEWAL_ELIGIBLE", entity: "SubscriptionLifecycleIntent", entityId: intent.id, values: { effectiveAt: intent.effectiveAt.toISOString(), planVersionId: subscription.planVersionId } });
      return intent;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  static async requestPlanChange(planCode: string, idempotencyKey: string, now = new Date()) {
    const context = await ownerContext();
    return prisma.$transaction(async rawTx => {
      const tx = rawTx as unknown as Tx;
      await lock(tx, context.vendorId);
      const retry = await tx.subscriptionLifecycleIntent.findUnique({ where: { vendorId_idempotencyKey: { vendorId: context.vendorId, idempotencyKey } } }); if (retry) return retry;
      const subscription = await this.currentPaid(tx, context.vendorId, now);
      if (subscription.status === "CANCELLED") throw new VendorSubscriptionLifecycleError("Cancel the period-end cancellation before changing plans.", "SUBSCRIPTION_CANCELLED");
      const requested = await tx.subscriptionPlan.findFirst({ where: { code: planCode, isActive: true }, include: { versions: { where: { publicationStatus: "PUBLISHED", effectiveAt: { lte: now } }, orderBy: [{ effectiveAt: "desc" }, { version: "desc" }], take: 1 } } });
      const version = requested?.versions[0]; if (!requested || !version) throw new VendorSubscriptionLifecycleError("The requested plan is unavailable.", "PLAN_UNAVAILABLE");
      if (requested.id === subscription.planId && version.id === subscription.planVersionId) throw new VendorSubscriptionLifecycleError("This is already the effective plan.", "PLAN_ALREADY_ACTIVE");
      const type: SubscriptionLifecycleIntentType = Number(version.monthlyPriceUgx) > Number(subscription.planVersion?.monthlyPriceUgx ?? subscription.plan.price) ? "UPGRADE" : "DOWNGRADE";
      const previous = await tx.subscriptionLifecycleIntent.findFirst({ where: { vendorId: context.vendorId, type: { in: ["UPGRADE", "DOWNGRADE"] }, status: "PENDING" } });
      if (previous) { await tx.subscriptionLifecycleIntent.update({ where: { id: previous.id }, data: { status: "CANCELLED", cancelledAt: now } }); await audit(tx, { vendorId: context.vendorId, userId: context.user.id, action: "PLAN_CHANGE_CANCELLED", entity: "SubscriptionLifecycleIntent", entityId: previous.id, values: { replaced: true } }); }
      const intent = await tx.subscriptionLifecycleIntent.create({ data: { vendorId: context.vendorId, subscriptionId: subscription.id, type, requestedPlanId: requested.id, requestedPlanVersionId: version.id, effectiveAt: subscription.currentPeriodEnd!, idempotencyKey, requestedById: context.user.id } });
      await audit(tx, { vendorId: context.vendorId, userId: context.user.id, action: "PLAN_CHANGE_REQUESTED", entity: "SubscriptionLifecycleIntent", entityId: intent.id, values: { type, planCode, effectiveAt: intent.effectiveAt.toISOString() } });
      return intent;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  static async cancelPlanChange() {
    const context = await ownerContext(); const now = new Date();
    return prisma.$transaction(async rawTx => { const tx = rawTx as unknown as Tx; await lock(tx, context.vendorId); const pending = await tx.subscriptionLifecycleIntent.findFirst({ where: { vendorId: context.vendorId, type: { in: ["UPGRADE", "DOWNGRADE"] }, status: "PENDING" } }); if (!pending) return null; const cancelled = await tx.subscriptionLifecycleIntent.update({ where: { id: pending.id }, data: { status: "CANCELLED", cancelledAt: now } }); await audit(tx, { vendorId: context.vendorId, userId: context.user.id, action: "PLAN_CHANGE_CANCELLED", entity: "SubscriptionLifecycleIntent", entityId: pending.id }); return cancelled; });
  }

  static async cancelAtPeriodEnd(now = new Date()) {
    const context = await ownerContext();
    return prisma.$transaction(async rawTx => { const tx = rawTx as unknown as Tx; await lock(tx, context.vendorId); const subscription = await this.currentPaid(tx, context.vendorId, now); if (subscription.status === "CANCELLED") return subscription; const cancelled = await tx.vendorSubscription.update({ where: { id: subscription.id }, data: { status: "CANCELLED", cancelledAt: now } }); await audit(tx, { vendorId: context.vendorId, userId: context.user.id, action: "SUBSCRIPTION_CANCELLATION_REQUESTED", entity: "VendorSubscription", entityId: subscription.id, values: { effectiveAt: subscription.currentPeriodEnd!.toISOString() } }); return cancelled; }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
