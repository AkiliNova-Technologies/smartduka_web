import { VendorStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { platformRevenueConfig } from "@/lib/platform-revenue/config";

const plusDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

/** Canonical source for trial state; it never infers a trial from account creation. */
export class VendorEntitlementService {
  static hasCapability(summary: { status: string; activeSubscription?: { plan: { features: unknown } } | null }, capability: string) { const safe = new Set(["ORDER_FULFILLMENT", "ORDER_READ", "TRANSACTION_READ", "SUBSCRIPTION_MANAGEMENT", "SETTINGS_ACCESS", "TEAM_READ", "PRODUCT_MAINTENANCE", "BASIC_ANALYTICS"]); if (summary.status === "LIMITED") return safe.has(capability); if (summary.status === "TRIAL") return true; const features = Array.isArray(summary.activeSubscription?.plan.features) ? summary.activeSubscription.plan.features : []; return safe.has(capability) || features.includes(capability); }
  static requireCapability(summary: { status: string; activeSubscription?: { plan: { features: unknown } } | null }, capability: string) { if (this.hasCapability(summary, capability)) return; const code = summary.status === "LIMITED" ? "SUBSCRIPTION_REQUIRED" : "PLAN_UPGRADE_REQUIRED"; throw Object.assign(new Error(summary.status === "LIMITED" ? "Choose a Mwezora plan to access this feature." : "Upgrade your plan to access this feature."), { code }); }
  static staffSeatLimit(summary: { status: string; activeSubscription?: { plan: { staffSeats: number } } | null }) { return summary.status === "TRIAL" ? 10 : summary.status === "ACTIVE_SUBSCRIPTION" ? summary.activeSubscription?.plan.staffSeats ?? 0 : 0; }
  static async staffUsage(vendorId: string, ownerId: string, summary?: Awaited<ReturnType<typeof VendorEntitlementService.summary>>) { const entitlement = summary ?? await this.summary(vendorId); const used = await prisma.user.count({ where: { vendorId, id: { not: ownerId }, vendorRole: { in: ["ADMIN", "MANAGER", "STAFF", "ACCOUNTANT"] } } }); const limit = this.staffSeatLimit(entitlement); return { used, limit, canAdd: used < limit }; }
  static async ensureEligibleVendor(vendorId: string) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId }, select: { id: true, ownerId: true, status: true, trialStartedAt: true, trialEndsAt: true } });
    if (!vendor || vendor.status !== VendorStatus.ACTIVE) throw new Error("An active shop is required.");
    if (!vendor.trialStartedAt || !vendor.trialEndsAt) {
      const now = new Date();
      await prisma.vendorProfile.update({ where: { id: vendorId }, data: { trialStartedAt: now, trialEndsAt: plusDays(now, platformRevenueConfig.trialDays) } });
    }
    const creditKey = `WELCOME_PROMOTION_CREDIT:${vendorId}`;
    await prisma.promotionCreditLedger.upsert({
      where: { grantKey: creditKey },
      update: {},
      create: { vendorId, type: "GRANT", amount: platformRevenueConfig.introductoryCreditUgx, grantKey: creditKey, reason: "WELCOME_PROMOTION_CREDIT", expiresAt: plusDays(new Date(), platformRevenueConfig.creditExpiryDays) },
    });
    const summary = await this.summary(vendorId);
    const milestone = summary.status === "EXPIRED" ? "expired" : [7, 3, 1].includes(summary.daysRemaining) ? `${summary.daysRemaining}-days` : null;
    if (milestone) await prisma.notification.upsert({ where: { idempotencyKey: `vendor-trial:${vendorId}:${milestone}` }, update: {}, create: { idempotencyKey: `vendor-trial:${vendorId}:${milestone}`, vendorId, userId: vendor.ownerId, type: summary.status === "EXPIRED" ? "WARNING" : "INFO", title: summary.status === "EXPIRED" ? "Your free trial has ended" : "Your free trial is ending soon", message: summary.status === "EXPIRED" ? "Choose a plan to continue using premium vendor features." : `Your free trial ends in ${summary.daysRemaining} day${summary.daysRemaining === 1 ? "" : "s"}.`, actionPath: "/vendor/marketing" } });
    return summary;
  }

  static async summary(vendorId: string) {
    const [vendor, subscription] = await Promise.all([
      prisma.vendorProfile.findUniqueOrThrow({ where: { id: vendorId }, select: { trialStartedAt: true, trialEndsAt: true } }),
      prisma.vendorSubscription.findFirst({ where: { vendorId, status: "ACTIVE", OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }] }, include: { plan: true }, orderBy: { updatedAt: "desc" } }),
    ]);
    const now = new Date();
    const trialActive = Boolean(vendor.trialEndsAt && vendor.trialEndsAt > now);
    return { status: subscription ? "ACTIVE_SUBSCRIPTION" : trialActive ? "TRIAL" : "LIMITED", trialStartedAt: vendor.trialStartedAt, trialEndsAt: vendor.trialEndsAt, daysRemaining: trialActive && vendor.trialEndsAt ? Math.max(0, Math.ceil((vendor.trialEndsAt.getTime() - now.getTime()) / 86_400_000)) : 0, hasActiveSubscription: Boolean(subscription), activeSubscription: subscription ? { id: subscription.id, currentPeriodStart: subscription.currentPeriodStart, currentPeriodEnd: subscription.currentPeriodEnd, plan: { code: subscription.plan.code, name: subscription.plan.name, price: subscription.plan.price.toString(), currency: subscription.plan.currency, staffSeats: subscription.plan.staffSeats, features: subscription.plan.features } } : null };
  }

  static async promotionalCreditAvailable(vendorId: string) {
    const entries = await prisma.promotionCreditLedger.findMany({ where: { vendorId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, select: { amount: true } });
    return Math.max(0, entries.reduce((sum, entry) => sum + Number(entry.amount), 0));
  }
}
