import { prisma } from "@/lib/prisma/client";

const dayMs = 86_400_000;
const notify = (subscription: { id: string; vendorId: string; vendor: { ownerId: string }; plan: { name: string }; currentPeriodEnd: Date | null }, suffix: string, title: string, message: string, type: "INFO" | "WARNING" = "INFO") => prisma.notification.upsert({ where: { idempotencyKey: `subscription:${subscription.id}:${suffix}` }, update: {}, create: { idempotencyKey: `subscription:${subscription.id}:${suffix}`, vendorId: subscription.vendorId, userId: subscription.vendor.ownerId, type, title, message, actionPath: "/vendor/subscription" } });

/** Performs date-based maintenance only. It never initiates a provider payment. */
export class SubscriptionScheduler {
  static async run(now = new Date()) {
    const duePeriods = await prisma.subscriptionPaidPeriod.findMany({ where: { status: "SCHEDULED", periodStart: { lte: now } }, select: { id: true, subscriptionId: true, billingIntentId: true, planVersion: { select: { planId: true } }, planVersionId: true, periodStart: true, periodEnd: true } });
    for (const period of duePeriods) await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`subscription-period:${period.subscriptionId}`}))::text AS lock`;
      const changed = await tx.subscriptionPaidPeriod.updateMany({ where: { id: period.id, status: "SCHEDULED", periodStart: { lte: now } }, data: { status: "ACTIVE", activatedAt: now } });
      if (!changed.count) return;
      await tx.subscriptionPaidPeriod.updateMany({ where: { subscriptionId: period.subscriptionId, status: "ACTIVE", id: { not: period.id }, periodEnd: { lte: period.periodStart } }, data: { status: "ENDED", endedAt: period.periodStart } });
      await tx.vendorSubscription.update({ where: { id: period.subscriptionId }, data: { planId: period.planVersion.planId, planVersionId: period.planVersionId, status: "ACTIVE", startedAt: period.periodStart, currentPeriodStart: period.periodStart, currentPeriodEnd: period.periodEnd, cancelledAt: null, gracePeriodEndsAt: null } });
      const billing = await tx.subscriptionBillingIntent.update({ where: { id: period.billingIntentId }, data: { activatedAt: now }, select: { lifecycleIntentId: true, vendorId: true } });
      if (billing.lifecycleIntentId) await tx.subscriptionLifecycleIntent.updateMany({ where: { id: billing.lifecycleIntentId, status: "PENDING" }, data: { status: "APPLIED", appliedAt: now } });
      await tx.auditLog.create({ data: { vendorId: billing.vendorId, action: "SUBSCRIPTION_PAID_PERIOD_ACTIVATED", entity: "SubscriptionPaidPeriod", entityId: period.id, newValues: { periodStart: period.periodStart.toISOString(), periodEnd: period.periodEnd.toISOString() } } });
    });
    await prisma.subscriptionPaidPeriod.updateMany({ where: { status: "ACTIVE", periodEnd: { lte: now } }, data: { status: "ENDED", endedAt: now } });
    const trials = await prisma.vendorTrial.findMany({ where: { status: "ACTIVE", expiresAt: { lte: now } }, select: { id: true, vendorId: true } });
    for (const trial of trials) await prisma.$transaction(async tx => { await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`subscription-lifecycle:${trial.vendorId}`}))::text AS lock`; const changed = await tx.vendorTrial.updateMany({ where: { id: trial.id, status: "ACTIVE", expiresAt: { lte: now } }, data: { status: "EXPIRED" } }); if (changed.count) await tx.auditLog.create({ data: { vendorId: trial.vendorId, action: "TRIAL_EXPIRED", entity: "VendorTrial", entityId: trial.id, newValues: { expiredAt: now.toISOString() } } }); });
    const activated = await prisma.vendorSubscription.updateMany({ where: { status: "PAST_DUE", currentPeriodStart: { lte: now }, currentPeriodEnd: { gt: now }, revenueOrder: { status: "PAID" } }, data: { status: "ACTIVE" } });
    const expiring = await prisma.vendorSubscription.findMany({ where: { status: { in: ["ACTIVE", "CANCELLED"] }, currentPeriodEnd: { lte: now } }, select: { id: true, vendorId: true } });
    for (const subscription of expiring) await prisma.$transaction(async tx => { const changed = await tx.vendorSubscription.updateMany({ where: { id: subscription.id, status: { in: ["ACTIVE", "CANCELLED"] }, currentPeriodEnd: { lte: now } }, data: { status: "EXPIRED" } }); if (changed.count) await tx.auditLog.create({ data: { vendorId: subscription.vendorId, action: "SUBSCRIPTION_PERIOD_EXPIRED", entity: "VendorSubscription", entityId: subscription.id, newValues: { transitionedAt: now.toISOString() } } }); });
    const active = await prisma.vendorSubscription.findMany({ where: { status: "ACTIVE", currentPeriodEnd: { gt: now } }, include: { vendor: { select: { ownerId: true } }, plan: { select: { name: true } } } });
    const milestones = await Promise.all(active.flatMap((subscription) => {
      const remaining = Math.ceil((subscription.currentPeriodEnd!.getTime() - now.getTime()) / dayMs);
      return [7, 3, 1].includes(remaining) ? [notify(subscription, `expiry:${remaining}d`, "Your subscription is ending soon", `Your ${subscription.plan.name} subscription ends in ${remaining} day${remaining === 1 ? "" : "s"}.`, "WARNING")] : [];
    }));
    const newlyExpired = await prisma.vendorSubscription.findMany({ where: { status: "EXPIRED", currentPeriodEnd: { lte: now } }, include: { vendor: { select: { ownerId: true } }, plan: { select: { name: true } } } });
    await Promise.all(newlyExpired.map((subscription) => notify(subscription, "expired", "Your Mwezora subscription has ended", "You can still manage existing orders and account essentials, but some growth features are limited until you choose a plan.", "WARNING")));
    const newlyActive = await prisma.vendorSubscription.findMany({ where: { status: "ACTIVE", currentPeriodStart: { lte: now }, currentPeriodEnd: { gt: now } }, include: { vendor: { select: { ownerId: true } }, plan: { select: { name: true } } } });
    await Promise.all(newlyActive.map((subscription) => notify(subscription, "activated", "Your subscription is active", `Your ${subscription.plan.name} subscription is active until ${subscription.currentPeriodEnd!.toLocaleDateString("en-UG", { dateStyle: "medium" })}.`)));
    return { activated: activated.count + duePeriods.length, expired: expiring.length, trialsExpired: trials.length, milestones: milestones.length };
  }
}
