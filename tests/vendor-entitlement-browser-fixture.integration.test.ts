import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma/client";
import { APPROVED_PLAN_DEFINITIONS, REVENUE_POLICY_VERSION } from "@/lib/revenue/entitlement-policy";

const enabled = process.env.RUN_VENDOR_ENTITLEMENT_BROWSER_ACCEPTANCE === "1";
describe.runIf(enabled).sequential("vendor entitlement browser fixtures", () => {
  afterAll(async () => prisma.$disconnect());
  it("seeds isolated paid vendor periods without provider calls", async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (process.env.CUSTOMER_ORDERS_TEST_DATABASE !== "isolated-local" || url.hostname !== "127.0.0.1" || url.pathname !== "/mwezora_customer_orders_tests") throw new Error("Refusing vendor browser fixtures outside the disposable database.");
    for (const [vendorId, code] of [["vendor-a", "STARTER"], ["vendor-b", "GROWTH"]] as const) {
      const policy = APPROVED_PLAN_DEFINITIONS[code];
      const plan = await prisma.subscriptionPlan.upsert({ where: { code }, update: { isActive: true }, create: { name: code === "STARTER" ? "Starter" : "Growth", slug: code.toLowerCase(), code, price: policy.monthlyPriceUgx, currency: "UGX", billingCycle: "MONTHLY", maxProducts: policy.activeProductLimit, commissionRate: 0, staffSeats: policy.staffLimit, features: [...policy.capabilities], isActive: true } });
      const version = await prisma.subscriptionPlanVersion.upsert({ where: { planCode_version: { planCode: code, version: 1 } }, update: {}, create: { planId: plan.id, planCode: code, version: 1, policyVersion: REVENUE_POLICY_VERSION, monthlyPriceUgx: policy.monthlyPriceUgx, activeProductLimit: policy.activeProductLimit, productSafetyCeiling: policy.productSafetyCeiling, branchLimit: policy.branchLimit, staffLimit: policy.staffLimit, capabilities: [...policy.capabilities], effectiveAt: new Date("2026-01-01T00:00:00.000Z"), publicationStatus: "PUBLISHED", publishedAt: new Date("2026-01-01T00:00:00.000Z") } });
      const subscription = await prisma.vendorSubscription.create({ data: { vendorId, planId: plan.id, planVersionId: version.id, status: "ACTIVE", startedAt: new Date(), currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000) } });
      await prisma.platformRevenueOrder.create({ data: { vendorId, subscriptionId: subscription.id, type: "SUBSCRIPTION", status: "PAID", subtotal: policy.monthlyPriceUgx, amountDue: policy.monthlyPriceUgx, currency: "UGX", idempotencyKey: `browser-${vendorId}-${code}` } });
    }
    const premium = APPROVED_PLAN_DEFINITIONS.PREMIUM;
    const premiumPlan = await prisma.subscriptionPlan.upsert({ where: { code: "PREMIUM" }, update: { isActive: true }, create: { name: "Premium", slug: "premium", code: "PREMIUM", price: premium.monthlyPriceUgx, currency: "UGX", billingCycle: "MONTHLY", maxProducts: premium.activeProductLimit, commissionRate: 0, staffSeats: premium.staffLimit, features: [...premium.capabilities], isActive: true } });
    await prisma.subscriptionPlanVersion.upsert({ where: { planCode_version: { planCode: "PREMIUM", version: 1 } }, update: {}, create: { planId: premiumPlan.id, planCode: "PREMIUM", version: 1, policyVersion: REVENUE_POLICY_VERSION, monthlyPriceUgx: premium.monthlyPriceUgx, activeProductLimit: premium.activeProductLimit, productSafetyCeiling: premium.productSafetyCeiling, branchLimit: premium.branchLimit, staffLimit: premium.staffLimit, capabilities: [...premium.capabilities], effectiveAt: new Date("2026-01-01T00:00:00.000Z"), publicationStatus: "PUBLISHED", publishedAt: new Date("2026-01-01T00:00:00.000Z") } });
    expect(await prisma.vendorSubscription.count({ where: { vendorId: { in: ["vendor-a", "vendor-b"] } } })).toBe(2);
  });
});
