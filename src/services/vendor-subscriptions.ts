import { createHash } from "node:crypto";
import { BillingCycle, Prisma, SubscriptionStatus, type SubscriptionBillingPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { VendorEntitlementService } from "@/services/vendor-entitlement";
import { APPROVED_PLAN_DEFINITIONS, REVENUE_POLICY_VERSION } from "@/lib/revenue/entitlement-policy";

const planDefinitions = [
  { code: "STARTER", name: "Starter", slug: "starter", description: "Essential tools for running a Mwezora shop.", price: 25_000, staffSeats: 2, sortOrder: 10, policy: APPROVED_PLAN_DEFINITIONS.STARTER },
  { code: "GROWTH", name: "Growth", slug: "growth", description: "Advanced tools for growing shops.", price: 60_000, staffSeats: 10, sortOrder: 20, policy: APPROVED_PLAN_DEFINITIONS.GROWTH },
  { code: "PREMIUM", name: "Premium", slug: "premium", description: "Premium insights and multi-branch operations.", price: 120_000, staffSeats: 30, sortOrder: 30, policy: APPROVED_PLAN_DEFINITIONS.PREMIUM },
] as const;
const BILLING_INTENT_TTL = 24 * 60 * 60 * 1000;
const merchantIdentity = () => process.env.PLATFORM_MTN_MERCHANT_ID?.trim() || process.env.PLATFORM_MTN_MERCHANT_CODE?.trim() || "";
const merchantDestinationHash = () => createHash("sha256").update(merchantIdentity()).digest("hex");
const addMonth = (date: Date) => {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, last));
  return next;
};

export class VendorSubscriptionService {
  static async seedPlans() { return Promise.all(planDefinitions.map(async ({ policy, ...plan }) => { const saved = await prisma.subscriptionPlan.upsert({ where: { code: plan.code }, update: { ...plan, maxProducts: policy.activeProductLimit, features: [...policy.capabilities], billingCycle: BillingCycle.MONTHLY, currency: "UGX", commissionRate: 0, isActive: true }, create: { ...plan, maxProducts: policy.activeProductLimit, features: [...policy.capabilities], billingCycle: BillingCycle.MONTHLY, currency: "UGX", commissionRate: 0, isActive: true } }); await prisma.subscriptionPlanVersion.upsert({ where: { planCode_version: { planCode: plan.code, version: policy.version } }, update: {}, create: { planId: saved.id, planCode: plan.code, version: policy.version, policyVersion: REVENUE_POLICY_VERSION, monthlyPriceUgx: policy.monthlyPriceUgx, billingCycle: BillingCycle.MONTHLY, activeProductLimit: policy.activeProductLimit, productSafetyCeiling: policy.productSafetyCeiling, branchLimit: policy.branchLimit, staffLimit: policy.staffLimit, capabilities: [...policy.capabilities], effectiveAt: new Date(), publicationStatus: "PUBLISHED", publishedAt: new Date() } }); return saved; })); }
  static async resolvePublishedPlan(planCode: string, now = new Date()) { return prisma.subscriptionPlan.findFirst({ where: { code: planCode, isActive: true }, include: { versions: { where: { publicationStatus: "PUBLISHED", effectiveAt: { lte: now } }, orderBy: [{ effectiveAt: "desc" }, { version: "desc" }], take: 1 } } }); }
  static async quote(planCode: string) { const context = await requireVendorContext("vendor:manage_shop"); const plan = await this.resolvePublishedPlan(planCode); const version = plan?.versions[0]; if (!plan || !version) throw new Error("This subscription plan is unavailable."); const entitlement = await VendorEntitlementService.summary(context.vendorId); const effectiveFrom = entitlement.activeSubscription?.currentPeriodEnd && entitlement.activeSubscription.currentPeriodEnd > new Date() ? entitlement.activeSubscription.currentPeriodEnd : new Date(); return { plan: { code: version.planCode, name: plan.name, description: plan.description, staffSeats: version.staffLimit, features: version.capabilities, version: version.version, policyVersion: version.policyVersion }, serviceValue: Number(version.monthlyPriceUgx), amountDue: Number(version.monthlyPriceUgx), currency: plan.currency, billingInterval: version.billingCycle, effectiveFrom, effectiveUntil: addMonth(effectiveFrom), promotionalCreditApplicable: false }; }
  static async purchase(input: { planCode: string; idempotencyKey: string; lifecycleIntentId?: string }) {
    const context = await requireVendorContext("vendor:manage_shop");
    if (context.vendorRole !== "OWNER") throw new Error("Only the shop owner can initiate subscription billing.");
    if (!input.idempotencyKey.trim()) throw new Error("An idempotency key is required.");
    if (!merchantIdentity()) throw new Error("The platform subscription merchant account is not configured.");
    const existing = await prisma.subscriptionBillingIntent.findUnique({ where: { vendorId_idempotencyKey: { vendorId: context.vendorId, idempotencyKey: input.idempotencyKey } }, include: { revenueOrder: { include: { subscription: { include: { plan: true, planVersion: true } } } } } });
    if (existing) return existing.revenueOrder;
    const now = new Date();
    return prisma.$transaction(async rawTx => {
      const tx = rawTx as unknown as Prisma.TransactionClient;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`subscription-billing:${context.vendorId}`}))::text AS lock`;
      const retry = await tx.subscriptionBillingIntent.findUnique({ where: { vendorId_idempotencyKey: { vendorId: context.vendorId, idempotencyKey: input.idempotencyKey } }, include: { revenueOrder: true } });
      if (retry) return retry.revenueOrder;
      const shop = await tx.vendorProfile.findUnique({ where: { id: context.vendorId }, select: { status: true, deletedAt: true, verificationStatus: true, vendorApplication: { select: { status: true } } } });
      if (!shop || shop.status !== "ACTIVE" || shop.deletedAt || shop.verificationStatus !== "VERIFIED" || shop.vendorApplication?.status !== "APPROVED") throw new Error("Shop approval and verification are required for subscription billing.");
      const pending = await tx.subscriptionBillingIntent.findFirst({ where: { vendorId: context.vendorId, paidPeriod: null, revenueOrder: { status: "AWAITING_PAYMENT" }, expiresAt: { gt: now } } });
      if (pending) throw new Error("A subscription payment is already awaiting confirmation. Do not pay again.");

      let purpose: SubscriptionBillingPurpose = "INITIAL_SUBSCRIPTION";
      let lifecycleIntent: Awaited<ReturnType<typeof tx.subscriptionLifecycleIntent.findFirst>> = null;
      let subscription: Awaited<ReturnType<typeof tx.vendorSubscription.findFirst>> = null;
      let plan = await tx.subscriptionPlan.findFirst({ where: { code: input.planCode, isActive: true }, include: { versions: { where: { publicationStatus: "PUBLISHED", effectiveAt: { lte: now } }, orderBy: [{ effectiveAt: "desc" }, { version: "desc" }], take: 1 } } });

      if (input.lifecycleIntentId) {
        lifecycleIntent = await tx.subscriptionLifecycleIntent.findFirst({ where: { id: input.lifecycleIntentId, vendorId: context.vendorId, status: "PENDING" } });
        if (!lifecycleIntent) throw new Error("The lifecycle request is unavailable or no longer pending.");
        subscription = await tx.vendorSubscription.findFirst({ where: { id: lifecycleIntent.subscriptionId, vendorId: context.vendorId }, include: { plan: true, planVersion: true } });
        if (!subscription?.planVersionId) throw new Error("A versioned subscription is required.");
        purpose = lifecycleIntent.type === "RENEWAL" ? "RENEWAL" : "SCHEDULED_PLAN_CHANGE";
        const targetVersionId = purpose === "RENEWAL" ? subscription.planVersionId : lifecycleIntent.requestedPlanVersionId;
        if (!targetVersionId) throw new Error("The scheduled plan version is missing.");
        const version = await tx.subscriptionPlanVersion.findUnique({ where: { id: targetVersionId }, include: { plan: true } });
        if (!version || version.publicationStatus !== "PUBLISHED" || version.plan.code !== input.planCode) throw new Error("The requested plan does not match the authoritative lifecycle request.");
        plan = { ...version.plan, versions: [version] };
      } else {
        const effective = await tx.vendorSubscription.findFirst({ where: { vendorId: context.vendorId, status: { in: ["ACTIVE", "CANCELLED"] }, currentPeriodEnd: { gt: now }, revenueOrder: { status: "PAID" } } });
        if (effective) throw new Error("Use a renewal or scheduled plan-change request for an existing subscription.");
      }

      const version = plan?.versions[0];
      if (!plan || !version || plan.currency !== "UGX") throw new Error("This subscription plan is unavailable.");
      if (!subscription) subscription = await tx.vendorSubscription.create({ data: { vendorId: context.vendorId, planId: plan.id, planVersionId: version.id, status: SubscriptionStatus.PAST_DUE } });
      const order = await tx.platformRevenueOrder.create({ data: { vendorId: context.vendorId, type: "SUBSCRIPTION", status: "AWAITING_PAYMENT", subtotal: version.monthlyPriceUgx, creditApplied: 0, amountDue: version.monthlyPriceUgx, currency: "UGX", idempotencyKey: input.idempotencyKey, ...(purpose === "INITIAL_SUBSCRIPTION" ? { subscriptionId: subscription.id } : {}) } });
      await tx.subscriptionBillingIntent.create({ data: { vendorId: context.vendorId, requestedById: context.user.id, subscriptionId: subscription.id, lifecycleIntentId: lifecycleIntent?.id, planVersionId: version.id, revenueOrderId: order.id, purpose, amount: version.monthlyPriceUgx, currency: "UGX", idempotencyKey: input.idempotencyKey, merchantDestinationHash: merchantDestinationHash(), expiresAt: new Date(now.getTime() + BILLING_INTENT_TTL) } });
      await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "SUBSCRIPTION_BILLING_INTENT_CREATED", entity: "PlatformRevenueOrder", entityId: order.id, newValues: { purpose, planCode: version.planCode, planVersionId: version.id, amount: version.monthlyPriceUgx.toString(), currency: "UGX", lifecycleIntentId: lifecycleIntent?.id ?? null } } });
      return order;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  static async read() { const context = await requireVendorContext(); const now = new Date(); const [entitlement, plans, history] = await Promise.all([VendorEntitlementService.summary(context.vendorId), prisma.subscriptionPlan.findMany({ where: { isActive: true, code: { in: ["STARTER", "GROWTH", "PREMIUM"] }, versions: { some: { publicationStatus: "PUBLISHED", effectiveAt: { lte: now } } } }, orderBy: { sortOrder: "asc" } }), prisma.vendorSubscription.findMany({ where: { vendorId: context.vendorId }, include: { plan: true, revenueOrder: { include: { paymentIntents: { take: 1, orderBy: { createdAt: "desc" } } } } }, orderBy: { createdAt: "desc" }, take: 20 })]); return { entitlement, plans, history: history.map((item) => ({ id: item.id, plan: { code: item.plan.code, name: item.plan.name }, status: item.status, currentPeriodStart: item.currentPeriodStart, currentPeriodEnd: item.currentPeriodEnd, amount: item.revenueOrder?.amountDue.toString() ?? item.plan.price.toString(), payment: item.revenueOrder?.paymentIntents[0] ? { status: item.revenueOrder.paymentIntents[0].status, reference: item.revenueOrder.paymentIntents[0].providerReference ? `••••${item.revenueOrder.paymentIntents[0].providerReference.slice(-4)}` : null } : null })) }; }
  static addMonth = addMonth;
  static merchantDestinationHash = merchantDestinationHash;
}
