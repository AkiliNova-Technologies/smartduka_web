import { Prisma, ProductStatus, UserStatus, VendorStatus, VendorTrialStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { APPROVED_PLAN_DEFINITIONS, REVENUE_POLICY_VERSION, SUBSCRIPTION_GRACE_DAYS, TRIAL_POLICY, capabilityMap, compatiblePaidPlanCode, type PaidPlanCode, type VendorCapability } from "@/lib/revenue/entitlement-policy";

const DAY = 86_400_000;
export type VendorEntitlementState = "TRIAL_ACTIVE" | "TRIAL_EXPIRED" | "SUBSCRIPTION_ACTIVE" | "SUBSCRIPTION_GRACE" | "SUBSCRIPTION_EXPIRED" | "CANCELLED_BUT_ACTIVE" | "LEGACY_TRANSITION" | "NO_ENTITLEMENT";
export type VendorResourceUsage = { ACTIVE_PRODUCTS: number; SHOP_BRANCHES: number; STAFF_ACCOUNTS: number };
export type VendorResourceLimits = { ACTIVE_PRODUCTS: number | null; ACTIVE_PRODUCTS_SAFETY_CEILING: number | null; SHOP_BRANCHES: number; STAFF_ACCOUNTS: number };
export type VendorEntitlementSnapshot = {
  policyVersion: typeof REVENUE_POLICY_VERSION; shopId: string; state: VendorEntitlementState; source: "TRIAL" | "SUBSCRIPTION" | "LEGACY_SUBSCRIPTION" | "NONE";
  subscriptionStatus: string | null; trialStatus: string | null; plan: { code: PaidPlanCode; historicalCode: string; version: number | null; legacy: boolean } | null;
  limits: VendorResourceLimits; usage: VendorResourceUsage; capabilities: Record<VendorCapability, boolean>;
  capabilityModes: Partial<Record<VendorCapability, "FULL" | "PREVIEW">>;
  effectiveFrom: Date | null; effectiveUntil: Date | null; graceEndsAt: Date | null; pendingPlanChange: { type: "UPGRADE" | "DOWNGRADE"; effectiveAt: Date; requestedPlanCode: string } | null;
  legacyCompatibility: { businessMappedToGrowth: boolean; planVersionMissing: boolean };
};

const noLimits = (): VendorResourceLimits => ({ ACTIVE_PRODUCTS: 0, ACTIVE_PRODUCTS_SAFETY_CEILING: null, SHOP_BRANCHES: 0, STAFF_ACCOUNTS: 0 });
type EntitlementDb = Prisma.TransactionClient;
const defaultDb = prisma as unknown as EntitlementDb;
async function loadShop(shopId: string, db: EntitlementDb = defaultDb) {
  return db.vendorProfile.findUniqueOrThrow({ where: { id: shopId }, select: {
    id: true, ownerId: true, status: true, trialStartedAt: true, trialEndsAt: true,
    trial: { select: { status: true, eligible: true, activatedAt: true, expiresAt: true, policyVersion: true } },
    subscriptions: { where: { status: { in: ["ACTIVE", "CANCELLED", "EXPIRED", "PAST_DUE"] } }, orderBy: [{ currentPeriodEnd: "desc" }, { updatedAt: "desc" }], select: {
      id: true, status: true, startedAt: true, currentPeriodStart: true, currentPeriodEnd: true, cancelledAt: true, gracePeriodEndsAt: true,
      plan: { select: { code: true, maxProducts: true, staffSeats: true, features: true } },
      planVersion: { select: { planCode: true, version: true, policyVersion: true, activeProductLimit: true, productSafetyCeiling: true, branchLimit: true, staffLimit: true, capabilities: true, effectiveAt: true, publicationStatus: true } },
      revenueOrder: { select: { status: true } },
    } },
    subscriptionLifecycleIntents: { where: { status: "PENDING", type: { in: ["UPGRADE", "DOWNGRADE"] } }, orderBy: { createdAt: "desc" }, take: 1, select: { type: true, effectiveAt: true, requestedPlanId: true } },
  } });
}
type LoadedShop = Awaited<ReturnType<typeof loadShop>>;
type SubscriptionCandidate = LoadedShop["subscriptions"][number];
const hasVerifiedPaidSource = (subscription: SubscriptionCandidate) => subscription.revenueOrder?.status === "PAID" || !subscription.planVersion;
function paidState(subscription: SubscriptionCandidate, now: Date) {
  const start = subscription.currentPeriodStart ?? subscription.startedAt;
  if (!hasVerifiedPaidSource(subscription) || start > now || !subscription.currentPeriodEnd) return null;
  if (subscription.currentPeriodEnd > now && (subscription.status === "ACTIVE" || subscription.status === "CANCELLED")) return subscription.status === "CANCELLED" ? "CANCELLED_BUT_ACTIVE" as const : "SUBSCRIPTION_ACTIVE" as const;
  const graceEndsAt = subscription.gracePeriodEndsAt ?? new Date(subscription.currentPeriodEnd.getTime() + SUBSCRIPTION_GRACE_DAYS * DAY);
  return subscription.currentPeriodEnd <= now && graceEndsAt > now ? "SUBSCRIPTION_GRACE" as const : null;
}
function planMetadata(subscription: SubscriptionCandidate) {
  const historicalCode = subscription.planVersion?.planCode ?? subscription.plan.code;
  const code = compatiblePaidPlanCode(historicalCode); if (!code) return null;
  const approved = APPROVED_PLAN_DEFINITIONS[code], version = subscription.planVersion;
  return { code, historicalCode, version: version?.version ?? null, legacy: !version,
    limits: { ACTIVE_PRODUCTS: version?.activeProductLimit ?? subscription.plan.maxProducts ?? approved.activeProductLimit, ACTIVE_PRODUCTS_SAFETY_CEILING: version?.productSafetyCeiling ?? approved.productSafetyCeiling, SHOP_BRANCHES: version?.branchLimit ?? approved.branchLimit, STAFF_ACCOUNTS: version?.staffLimit ?? subscription.plan.staffSeats ?? approved.staffLimit },
    capabilities: capabilityMap(version?.capabilities ?? approved.capabilities) };
}

export class VendorEntitlementService {
  static async usage(shopId: string, ownerId?: string, db: EntitlementDb = defaultDb): Promise<VendorResourceUsage> {
    const owner = ownerId ?? (await db.vendorProfile.findUniqueOrThrow({ where: { id: shopId }, select: { ownerId: true } })).ownerId;
    const [products, branches, staff] = await Promise.all([
      db.product.count({ where: { vendorId: shopId, deletedAt: null, status: { in: [ProductStatus.ACTIVE, ProductStatus.PUBLISHED] } } }),
      db.shopBranch.count({ where: { shopId, isActive: true } }),
      db.user.count({ where: { vendorId: shopId, id: { not: owner }, status: UserStatus.ACTIVE, vendorRole: { in: ["ADMIN", "MANAGER", "STAFF", "ACCOUNTANT"] } } }),
    ]);
    return { ACTIVE_PRODUCTS: products, SHOP_BRANCHES: branches, STAFF_ACCOUNTS: staff };
  }

  static async getForShop(shopId: string, now = new Date(), db: EntitlementDb = defaultDb): Promise<VendorEntitlementSnapshot> {
    const shop = await loadShop(shopId, db), usage = await this.usage(shop.id, shop.ownerId, db);
    const paid = shop.subscriptions.find((subscription) => paidState(subscription, now));
    if (paid) {
      const state = paidState(paid, now)!, metadata = planMetadata(paid);
      if (metadata) { const graceEndsAt = state === "SUBSCRIPTION_GRACE" && paid.currentPeriodEnd ? paid.gracePeriodEndsAt ?? new Date(paid.currentPeriodEnd.getTime() + SUBSCRIPTION_GRACE_DAYS * DAY) : null;
        const change = shop.subscriptionLifecycleIntents[0]; const requested = change?.requestedPlanId ? await db.subscriptionPlan.findUnique({ where: { id: change.requestedPlanId }, select: { code: true } }) : null;
        return { policyVersion: REVENUE_POLICY_VERSION, shopId: shop.id, state: metadata.legacy && state === "SUBSCRIPTION_ACTIVE" ? "LEGACY_TRANSITION" : state, source: metadata.legacy ? "LEGACY_SUBSCRIPTION" : "SUBSCRIPTION", subscriptionStatus: paid.status, trialStatus: shop.trial?.status ?? null, plan: { code: metadata.code, historicalCode: metadata.historicalCode, version: metadata.version, legacy: metadata.legacy }, limits: metadata.limits, usage, capabilities: metadata.capabilities, capabilityModes: Object.fromEntries(Object.entries(metadata.capabilities).filter(([, enabled]) => enabled).map(([capability]) => [capability, "FULL"])), effectiveFrom: paid.currentPeriodStart ?? paid.startedAt, effectiveUntil: paid.currentPeriodEnd, graceEndsAt, pendingPlanChange: change && requested ? { type: change.type as "UPGRADE" | "DOWNGRADE", effectiveAt: change.effectiveAt, requestedPlanCode: requested.code } : null, legacyCompatibility: { businessMappedToGrowth: metadata.historicalCode === "BUSINESS", planVersionMissing: metadata.legacy } };
      }
    }
    const trial = shop.trial ?? (shop.trialEndsAt ? { status: shop.trialEndsAt > now ? VendorTrialStatus.ACTIVE : VendorTrialStatus.EXPIRED, eligible: true, activatedAt: shop.trialStartedAt, expiresAt: shop.trialEndsAt, policyVersion: "LEGACY_TRIAL_V0" } : null);
    if (trial?.expiresAt && trial.expiresAt > now && trial.status === VendorTrialStatus.ACTIVE) return { policyVersion: REVENUE_POLICY_VERSION, shopId: shop.id, state: "TRIAL_ACTIVE", source: "TRIAL", subscriptionStatus: null, trialStatus: trial.status, plan: null, limits: { ACTIVE_PRODUCTS: 25, ACTIVE_PRODUCTS_SAFETY_CEILING: null, SHOP_BRANCHES: 1, STAFF_ACCOUNTS: 0 }, usage, capabilities: capabilityMap(TRIAL_POLICY.capabilities), capabilityModes: { BASIC_ANALYTICS: "FULL", ADVANCED_ANALYTICS: "PREVIEW", STANDARD_INVENTORY: "FULL", PRODUCT_MANAGEMENT: "FULL", BRANCH_MANAGEMENT: "FULL" }, effectiveFrom: trial.activatedAt, effectiveUntil: trial.expiresAt, graceEndsAt: null, pendingPlanChange: null, legacyCompatibility: { businessMappedToGrowth: false, planVersionMissing: false } };
    const hadPaidSubscription = shop.subscriptions.some(hasVerifiedPaidSource);
    return { policyVersion: REVENUE_POLICY_VERSION, shopId: shop.id, state: trial ? "TRIAL_EXPIRED" : hadPaidSubscription ? "SUBSCRIPTION_EXPIRED" : "NO_ENTITLEMENT", source: "NONE", subscriptionStatus: shop.subscriptions[0]?.status ?? null, trialStatus: trial ? VendorTrialStatus.EXPIRED : null, plan: null, limits: noLimits(), usage, capabilities: capabilityMap([]), capabilityModes: {}, effectiveFrom: null, effectiveUntil: trial?.expiresAt ?? shop.subscriptions[0]?.currentPeriodEnd ?? null, graceEndsAt: null, pendingPlanChange: null, legacyCompatibility: { businessMappedToGrowth: false, planVersionMissing: false } };
  }

  /** Compatibility adapter for existing callers; R2A adds no new mutation enforcement. */
  static legacySummary(snapshot: VendorEntitlementSnapshot) { const active = ["SUBSCRIPTION_ACTIVE", "CANCELLED_BUT_ACTIVE", "SUBSCRIPTION_GRACE", "LEGACY_TRANSITION"].includes(snapshot.state);
    return { status: active ? "ACTIVE_SUBSCRIPTION" : snapshot.state === "TRIAL_ACTIVE" ? "TRIAL" : "LIMITED", trialStartedAt: snapshot.source === "TRIAL" ? snapshot.effectiveFrom : null, trialEndsAt: snapshot.source === "TRIAL" || snapshot.state === "TRIAL_EXPIRED" ? snapshot.effectiveUntil : null, daysRemaining: snapshot.effectiveUntil && snapshot.effectiveUntil > new Date() ? Math.max(0, Math.ceil((snapshot.effectiveUntil.getTime() - Date.now()) / DAY)) : 0, hasActiveSubscription: active, activeSubscription: active && snapshot.plan ? { id: "resolved", currentPeriodStart: snapshot.effectiveFrom, currentPeriodEnd: snapshot.effectiveUntil, plan: { code: snapshot.plan.historicalCode, name: snapshot.plan.code, price: String(APPROVED_PLAN_DEFINITIONS[snapshot.plan.code].monthlyPriceUgx), currency: "UGX", staffSeats: snapshot.limits.STAFF_ACCOUNTS, features: Object.entries(snapshot.capabilities).filter(([, enabled]) => enabled).map(([key]) => key) } } : null };
  }
  static async summary(shopId: string) { return this.legacySummary(await this.getForShop(shopId)); }
  static hasCapability(summary: { status: string; activeSubscription?: { plan: { features: unknown } } | null }, capability: string) { const safe = new Set(["ORDER_FULFILLMENT", "ORDER_READ", "TRANSACTION_READ", "SUBSCRIPTION_MANAGEMENT", "SETTINGS_ACCESS", "TEAM_READ", "PRODUCT_MAINTENANCE", "BASIC_ANALYTICS"]); if (summary.status === "LIMITED") return safe.has(capability); if (summary.status === "TRIAL" && capability === "PRODUCT_PUBLISHING") return TRIAL_POLICY.capabilities.includes("PRODUCT_MANAGEMENT"); const features = Array.isArray(summary.activeSubscription?.plan.features) ? summary.activeSubscription.plan.features : []; return safe.has(capability) || features.includes(capability) || (capability === "PRODUCT_PUBLISHING" && features.includes("PRODUCT_MANAGEMENT")); }
  static requireCapability(summary: { status: string; activeSubscription?: { plan: { features: unknown } } | null }, capability: string) { if (this.hasCapability(summary, capability)) return; throw Object.assign(new Error(summary.status === "LIMITED" ? "Choose a Mwezora plan to access this feature." : "Upgrade your plan to access this feature."), { code: summary.status === "LIMITED" ? "SUBSCRIPTION_REQUIRED" : "PLAN_UPGRADE_REQUIRED" }); }
  // Existing mutation enforcement remains unchanged until R2B; the R2A snapshot still reports the approved trial quota of zero staff.
  static staffSeatLimit(summary: { status: string; activeSubscription?: { plan: { staffSeats: number } } | null }) { return summary.status === "TRIAL" ? 10 : summary.status === "ACTIVE_SUBSCRIPTION" ? summary.activeSubscription?.plan.staffSeats ?? 0 : 0; }
  static async staffUsage(shopId: string, ownerId: string, summary?: Awaited<ReturnType<typeof VendorEntitlementService.summary>>) { const entitlement = summary ?? await this.summary(shopId), used = (await this.usage(shopId, ownerId)).STAFF_ACCOUNTS, limit = this.staffSeatLimit(entitlement); return { used, limit, canAdd: used < limit }; }
  /** Retained for existing callers; it no longer starts trials or grants advertising credit. */
  static async ensureEligibleVendor(shopId: string) { const vendor = await prisma.vendorProfile.findUnique({ where: { id: shopId }, select: { status: true } }); if (!vendor || vendor.status !== VendorStatus.ACTIVE) throw new Error("An active shop is required."); return this.summary(shopId); }
  static async promotionalCreditAvailable(shopId: string) { const entries = await prisma.promotionCreditLedger.findMany({ where: { vendorId: shopId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, select: { amount: true } }); return Math.max(0, entries.reduce((sum, entry) => sum + Number(entry.amount), 0)); }
}
