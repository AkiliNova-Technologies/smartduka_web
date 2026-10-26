import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: async () => session.userId }));

import { prisma } from "@/lib/prisma/client";
import { PlatformPaymentReconciliationService } from "@/services/platform-payment-reconciliation";
import { SubscriptionScheduler } from "@/services/subscription-scheduler";
import { VendorSubscriptionLifecycleService } from "@/services/vendor-subscription-lifecycle";
import { VendorSubscriptionService } from "@/services/vendor-subscriptions";

const enabled = process.env.RUN_REVENUE_ENTITLEMENT_DB_TESTS === "1";
const prices = { STARTER: 25_000, GROWTH: 60_000, PREMIUM: 120_000 } as const;

async function reset() {
  const url = process.env.DATABASE_URL;
  if (process.env.REVENUE_ENTITLEMENT_TEST_DATABASE !== "isolated-local" || !url || new URL(url).pathname !== "/mwezora_revenue_entitlement_tests") throw new Error("Disposable revenue database required.");
  await prisma.notification.deleteMany();
  await prisma.subscriptionPaidPeriod.deleteMany();
  await prisma.platformPaymentIntent.deleteMany();
  await prisma.subscriptionBillingIntent.deleteMany();
  await prisma.subscriptionLifecycleIntent.deleteMany();
  await prisma.platformRevenueOrder.deleteMany();
  await prisma.vendorSubscription.deleteMany();
  await prisma.subscriptionPlanVersion.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.vendorTrialExtension.deleteMany();
  await prisma.vendorTrial.deleteMany();
  await prisma.vendorApplication.deleteMany();
  await prisma.vendorProfile.deleteMany();
  await prisma.user.deleteMany();
}

async function seed(code: keyof typeof prices) {
  const owner = await prisma.user.create({ data: { name: "Owner", email: `${randomUUID()}@test.local`, status: "ACTIVE", vendorRole: "OWNER" } });
  const vendor = await prisma.vendorProfile.create({ data: { ownerId: owner.id, storeName: "Billing shop", slug: randomUUID(), status: "ACTIVE", verificationStatus: "VERIFIED" } });
  await prisma.user.update({ where: { id: owner.id }, data: { vendorId: vendor.id } });
  await prisma.vendorApplication.create({ data: { userId: owner.id, vendorProfileId: vendor.id, storeName: vendor.storeName, storeSlug: randomUUID(), businessType: "SOLE_PROPRIETOR", businessEmail: owner.email, businessPhone: "+256700000000", streetAddress: "Kampala", status: "APPROVED" } });
  const plan = await prisma.subscriptionPlan.create({ data: { name: code, slug: code.toLowerCase(), code, price: prices[code], currency: "UGX", commissionRate: 0, isActive: true } });
  const version = await prisma.subscriptionPlanVersion.create({ data: { planId: plan.id, planCode: code, version: 1, policyVersion: "MWEZORA_REVENUE_V1", monthlyPriceUgx: prices[code], activeProductLimit: 100, productSafetyCeiling: 100, branchLimit: 1, staffLimit: 2, capabilities: [], effectiveAt: new Date(Date.now() - 86_400_000), publicationStatus: "PUBLISHED", publishedAt: new Date(Date.now() - 86_400_000) } });
  session.userId = owner.id;
  return { owner, vendor, plan, version };
}

async function paymentFor(orderId: string, vendorId: string) {
  const order = await prisma.platformRevenueOrder.findUniqueOrThrow({ where: { id: orderId } });
  return prisma.platformPaymentIntent.create({ data: { platformRevenueOrderId: order.id, vendorId, provider: "MTN_MOMO", amount: order.amountDue, currency: order.currency, status: "PENDING", providerReference: randomUUID(), idempotencyKey: randomUUID() } });
}

async function buyAndVerify(code: keyof typeof prices) {
  const fixture = await seed(code);
  const order = await VendorSubscriptionService.purchase({ planCode: code, idempotencyKey: randomUUID() });
  const payment = await paymentFor(order.id, fixture.vendor.id);
  const result = await PlatformPaymentReconciliationService.applyTrustedResult(payment.id, "SUCCESSFUL", String(prices[code]), "UGX");
  return { ...fixture, order, payment, result };
}

describe.runIf(enabled).sequential("R3B verified subscription billing", () => {
  beforeEach(async () => { process.env.PLATFORM_MTN_MERCHANT_ID = "sandbox-platform-merchant"; await reset(); });
  afterAll(async () => prisma.$disconnect());

  for (const code of ["STARTER", "GROWTH", "PREMIUM"] as const) it(`activates one paid ${code} period only after verified success`, async () => {
    const result = await buyAndVerify(code);
    expect(result.result.outcome).toBe("TRANSITION_APPLIED");
    expect(await prisma.subscriptionPaidPeriod.count({ where: { subscriptionId: (await prisma.platformRevenueOrder.findUniqueOrThrow({ where: { id: result.order.id } })).subscriptionId! } })).toBe(1);
    expect((await prisma.platformRevenueOrder.findUniqueOrThrow({ where: { id: result.order.id } })).status).toBe("PAID");
  });

  it("uses immutable server pricing and places mismatched success into review", async () => {
    const fixture = await seed("STARTER");
    const order = await VendorSubscriptionService.purchase({ planCode: "STARTER", idempotencyKey: randomUUID() });
    expect(Number(order.amountDue)).toBe(25_000);
    const payment = await paymentFor(order.id, fixture.vendor.id);
    await expect(PlatformPaymentReconciliationService.applyTrustedResult(payment.id, "SUCCESSFUL", "1", "UGX")).resolves.toMatchObject({ outcome: "REVIEW_REQUIRED" });
    expect(await prisma.subscriptionPaidPeriod.count()).toBe(0);
  });

  it("keeps failed, rejected-equivalent, expired and unknown outcomes from granting access", async () => {
    for (const status of ["FAILED", "EXPIRED"] as const) {
      await reset(); const fixture = await seed("STARTER"); const order = await VendorSubscriptionService.purchase({ planCode: "STARTER", idempotencyKey: randomUUID() }); const payment = await paymentFor(order.id, fixture.vendor.id);
      await PlatformPaymentReconciliationService.applyTrustedResult(payment.id, status, "25000", "UGX");
      expect(await prisma.subscriptionPaidPeriod.count()).toBe(0);
    }
    expect(await prisma.subscriptionPaidPeriod.count()).toBe(0);
  });

  it("deduplicates callbacks and concurrent reconciliation into one paid period", async () => {
    const fixture = await seed("STARTER"); const order = await VendorSubscriptionService.purchase({ planCode: "STARTER", idempotencyKey: randomUUID() }); const payment = await paymentFor(order.id, fixture.vendor.id);
    const results = await Promise.all([PlatformPaymentReconciliationService.applyTrustedResult(payment.id, "SUCCESSFUL", "25000", "UGX"), PlatformPaymentReconciliationService.applyTrustedResult(payment.id, "SUCCESSFUL", "25000", "UGX")]);
    expect(results.map(item => item.outcome).sort()).toEqual(["IGNORED_STALE", "TRANSITION_APPLIED"]);
    expect(await prisma.subscriptionPaidPeriod.count()).toBe(1);
  });

  it("schedules an early renewal without erasing remaining paid access", async () => {
    const initial = await buyAndVerify("STARTER");
    const subscription = await prisma.vendorSubscription.findFirstOrThrow({ where: { vendorId: initial.vendor.id } });
    const originalEnd = subscription.currentPeriodEnd!;
    const lifecycle = await VendorSubscriptionLifecycleService.establishRenewalEligibility(randomUUID());
    const order = await VendorSubscriptionService.purchase({ planCode: "STARTER", idempotencyKey: randomUUID(), lifecycleIntentId: lifecycle.id });
    const payment = await paymentFor(order.id, initial.vendor.id);
    await PlatformPaymentReconciliationService.applyTrustedResult(payment.id, "SUCCESSFUL", "25000", "UGX");
    const scheduled = await prisma.subscriptionPaidPeriod.findFirstOrThrow({ where: { billingIntent: { revenueOrderId: order.id } } });
    expect(scheduled).toMatchObject({ status: "SCHEDULED", periodStart: originalEnd });
    expect((await prisma.vendorSubscription.findUniqueOrThrow({ where: { id: subscription.id } })).currentPeriodEnd).toEqual(originalEnd);
  });

  it("uses a clamped UTC calendar month at month end", () => {
    expect(VendorSubscriptionService.addMonth(new Date("2027-01-31T12:00:00.000Z"))).toEqual(new Date("2027-02-28T12:00:00.000Z"));
    expect(VendorSubscriptionService.addMonth(new Date("2028-01-31T12:00:00.000Z"))).toEqual(new Date("2028-02-29T12:00:00.000Z"));
  });

  it("requires verified payment for a scheduled upgrade and applies it only at the boundary", async () => {
    const initial = await buyAndVerify("STARTER");
    const growth = await prisma.subscriptionPlan.create({ data: { name: "GROWTH", slug: "growth", code: "GROWTH", price: 60_000, currency: "UGX", commissionRate: 0 } });
    await prisma.subscriptionPlanVersion.create({ data: { planId: growth.id, planCode: "GROWTH", version: 1, policyVersion: "MWEZORA_REVENUE_V1", monthlyPriceUgx: 60_000, activeProductLimit: 500, productSafetyCeiling: 500, branchLimit: 3, staffLimit: 10, capabilities: [], effectiveAt: new Date(Date.now() - 1000), publicationStatus: "PUBLISHED", publishedAt: new Date() } });
    const change = await VendorSubscriptionLifecycleService.requestPlanChange("GROWTH", randomUUID());
    const order = await VendorSubscriptionService.purchase({ planCode: "GROWTH", idempotencyKey: randomUUID(), lifecycleIntentId: change.id });
    expect((await prisma.vendorSubscription.findFirstOrThrow({ where: { vendorId: initial.vendor.id }, include: { plan: true } })).plan.code).toBe("STARTER");
    const payment = await paymentFor(order.id, initial.vendor.id);
    await PlatformPaymentReconciliationService.applyTrustedResult(payment.id, "SUCCESSFUL", "60000", "UGX");
    const period = await prisma.subscriptionPaidPeriod.findUniqueOrThrow({ where: { paymentIntentId: payment.id } });
    await SubscriptionScheduler.run(new Date(period.periodStart.getTime() + 1));
    expect((await prisma.vendorSubscription.findFirstOrThrow({ where: { vendorId: initial.vendor.id }, include: { plan: true } })).plan.code).toBe("GROWTH");
  });

  it("routes verified late success after cancellation to manual review", async () => {
    const initial = await buyAndVerify("STARTER");
    const lifecycle = await VendorSubscriptionLifecycleService.establishRenewalEligibility(randomUUID());
    const order = await VendorSubscriptionService.purchase({ planCode: "STARTER", idempotencyKey: randomUUID(), lifecycleIntentId: lifecycle.id });
    const payment = await paymentFor(order.id, initial.vendor.id);
    await VendorSubscriptionLifecycleService.cancelAtPeriodEnd();
    await expect(PlatformPaymentReconciliationService.applyTrustedResult(payment.id, "SUCCESSFUL", "25000", "UGX")).resolves.toMatchObject({ outcome: "REVIEW_REQUIRED" });
    expect(await prisma.subscriptionPaidPeriod.count({ where: { paymentIntentId: payment.id } })).toBe(0);
  });

  it("never grants advertising credit or mutates customer payment records", async () => {
    await buyAndVerify("STARTER");
    expect(await prisma.promotionCreditLedger.count()).toBe(0);
    expect(await prisma.paymentIntent.count()).toBe(0);
  });
});
