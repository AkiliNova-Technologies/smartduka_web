import { prisma } from "@/lib/prisma/client";

const dayMs = 86_400_000;
const notify = (subscription: { id: string; vendorId: string; vendor: { ownerId: string }; plan: { name: string }; currentPeriodEnd: Date | null }, suffix: string, title: string, message: string, type: "INFO" | "WARNING" = "INFO") => prisma.notification.upsert({ where: { idempotencyKey: `subscription:${subscription.id}:${suffix}` }, update: {}, create: { idempotencyKey: `subscription:${subscription.id}:${suffix}`, vendorId: subscription.vendorId, userId: subscription.vendor.ownerId, type, title, message, actionPath: "/vendor/subscription" } });

/** Performs date-based maintenance only. It never initiates a provider payment. */
export class SubscriptionScheduler {
  static async run(now = new Date()) {
    const activated = await prisma.vendorSubscription.updateMany({ where: { status: "PAST_DUE", currentPeriodStart: { lte: now }, currentPeriodEnd: { gt: now }, revenueOrder: { status: "PAID" } }, data: { status: "ACTIVE" } });
    const expired = await prisma.vendorSubscription.updateMany({ where: { status: "ACTIVE", currentPeriodEnd: { lte: now } }, data: { status: "EXPIRED" } });
    const active = await prisma.vendorSubscription.findMany({ where: { status: "ACTIVE", currentPeriodEnd: { gt: now } }, include: { vendor: { select: { ownerId: true } }, plan: { select: { name: true } } } });
    const milestones = await Promise.all(active.flatMap((subscription) => {
      const remaining = Math.ceil((subscription.currentPeriodEnd!.getTime() - now.getTime()) / dayMs);
      return [7, 3, 1].includes(remaining) ? [notify(subscription, `expiry:${remaining}d`, "Your subscription is ending soon", `Your ${subscription.plan.name} subscription ends in ${remaining} day${remaining === 1 ? "" : "s"}.`, "WARNING")] : [];
    }));
    const newlyExpired = await prisma.vendorSubscription.findMany({ where: { status: "EXPIRED", currentPeriodEnd: { lte: now } }, include: { vendor: { select: { ownerId: true } }, plan: { select: { name: true } } } });
    await Promise.all(newlyExpired.map((subscription) => notify(subscription, "expired", "Your Mwezora subscription has ended", "You can still manage existing orders and account essentials, but some growth features are limited until you choose a plan.", "WARNING")));
    const newlyActive = await prisma.vendorSubscription.findMany({ where: { status: "ACTIVE", currentPeriodStart: { lte: now }, currentPeriodEnd: { gt: now } }, include: { vendor: { select: { ownerId: true } }, plan: { select: { name: true } } } });
    await Promise.all(newlyActive.map((subscription) => notify(subscription, "activated", "Your subscription is active", `Your ${subscription.plan.name} subscription is active until ${subscription.currentPeriodEnd!.toLocaleDateString("en-UG", { dateStyle: "medium" })}.`)));
    return { activated: activated.count, expired: expired.count, milestones: milestones.length };
  }
}
