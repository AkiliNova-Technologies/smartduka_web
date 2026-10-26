import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma/client";

const session = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: async () => session.userId }));

import { SubscriptionScheduler } from "@/services/subscription-scheduler";
import { VendorEntitlementService } from "@/services/vendor-entitlement";
import { VendorSubscriptionLifecycleService } from "@/services/vendor-subscription-lifecycle";

const enabled = process.env.RUN_REVENUE_ENTITLEMENT_DB_TESTS === "1";
const now = new Date("2026-10-18T20:00:00.000Z");
const days = (value: number) => new Date(now.getTime() + value * 86_400_000);

async function reset() {
  const url = process.env.DATABASE_URL;
  if (process.env.REVENUE_ENTITLEMENT_TEST_DATABASE !== "isolated-local" || !url) throw new Error("Isolated database marker is required.");
  const parsed = new URL(url);
  if (parsed.hostname !== "127.0.0.1" || parsed.pathname !== "/mwezora_revenue_entitlement_tests") throw new Error("Refusing lifecycle cleanup outside the disposable database.");
  await prisma.notification.deleteMany();
  await prisma.subscriptionPaidPeriod.deleteMany();
  await prisma.platformPaymentIntent.deleteMany();
  await prisma.subscriptionBillingIntent.deleteMany();
  await prisma.subscriptionLifecycleIntent.deleteMany();
  await prisma.platformRevenueOrder.deleteMany();
  await prisma.vendorSubscription.deleteMany();
  await prisma.subscriptionPlanVersion.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.vendorTrialExtension.deleteMany();
  await prisma.vendorTrial.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.vendorApplication.deleteMany();
  await prisma.vendorProfile.deleteMany();
  await prisma.user.deleteMany();
}

async function vendor(label: string, eligible = true) {
  const owner = await prisma.user.create({ data: { name: `${label} owner`, email: `${randomUUID()}@test.local`, status: "ACTIVE", vendorRole: "OWNER" } });
  const shop = await prisma.vendorProfile.create({ data: { ownerId: owner.id, storeName: label, slug: `${label.toLowerCase().replaceAll(" ", "-")}-${randomUUID()}`, status: "ACTIVE", verificationStatus: eligible ? "VERIFIED" : "NOT_APPLIED" } });
  await prisma.vendorApplication.create({ data: { userId: owner.id, storeName: label, storeSlug: `application-${randomUUID()}`, businessType: "SOLE_PROPRIETOR", businessEmail: owner.email!, businessPhone: "+256700000000", streetAddress: "Kampala", status: eligible ? "APPROVED" : "PENDING", vendorProfileId: shop.id } });
  await prisma.user.update({ where: { id: owner.id }, data: { vendorId: shop.id } });
  session.userId = owner.id;
  return { owner, shop };
}

async function plan(code: "STARTER" | "GROWTH" | "PREMIUM", price: number) {
  const created = await prisma.subscriptionPlan.create({ data: { name: code, slug: code.toLowerCase(), code, price, commissionRate: 0, isActive: true } });
  const version = await prisma.subscriptionPlanVersion.create({ data: { planId: created.id, planCode: code, version: 1, policyVersion: "MWEZORA_REVENUE_V1", monthlyPriceUgx: price, activeProductLimit: 100, productSafetyCeiling: 100, branchLimit: 1, staffLimit: 2, capabilities: [], effectiveAt: days(-10), publicationStatus: "PUBLISHED", publishedAt: days(-10) } });
  return { plan: created, version };
}

async function paid(vendorId: string, code: "STARTER" | "GROWTH" | "PREMIUM" = "STARTER", price = 25_000) {
  const catalog = await plan(code, price);
  const subscription = await prisma.vendorSubscription.create({ data: { vendorId, planId: catalog.plan.id, planVersionId: catalog.version.id, status: "ACTIVE", startedAt: days(-2), currentPeriodStart: days(-2), currentPeriodEnd: days(28) } });
  await prisma.platformRevenueOrder.create({ data: { vendorId, subscriptionId: subscription.id, type: "SUBSCRIPTION", status: "PAID", subtotal: price, amountDue: price, currency: "UGX", idempotencyKey: randomUUID() } });
  return { ...catalog, subscription };
}

describe.runIf(enabled).sequential("R3A authoritative subscription lifecycle", () => {
  beforeEach(reset);
  afterAll(async () => prisma.$disconnect());

  it("activates an eligible trial explicitly for exactly fourteen days", async () => {
    const { shop } = await vendor("Eligible");
    expect((await VendorEntitlementService.getForShop(shop.id, now)).state).toBe("NO_ENTITLEMENT");
    const trial = await VendorSubscriptionLifecycleService.activateTrial("activate-1", now);
    expect(trial).toMatchObject({ status: "ACTIVE", activatedAt: now, expiresAt: days(14) });
    expect(await prisma.auditLog.count({ where: { vendorId: shop.id, action: "TRIAL_ACTIVATED" } })).toBe(1);
  });

  it("rejects an ineligible shop without creating trial state", async () => {
    const { shop } = await vendor("Ineligible", false);
    await expect(VendorSubscriptionLifecycleService.activateTrial("activate-2", now)).rejects.toMatchObject({ code: "TRIAL_NOT_ELIGIBLE" });
    expect(await prisma.vendorTrial.count({ where: { vendorId: shop.id } })).toBe(0);
  });

  it("makes same-key activation idempotent and concurrent different-key activation single-use", async () => {
    const { shop } = await vendor("Idempotent");
    const first = await VendorSubscriptionLifecycleService.activateTrial("same-key", now);
    const retry = await VendorSubscriptionLifecycleService.activateTrial("same-key", now);
    expect(retry.id).toBe(first.id);
    await reset();
    const concurrent = await vendor("Concurrent");
    session.userId = concurrent.owner.id;
    const outcomes = await Promise.allSettled([VendorSubscriptionLifecycleService.activateTrial("one", now), VendorSubscriptionLifecycleService.activateTrial("two", now)]);
    expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.vendorTrial.count({ where: { vendorId: concurrent.shop.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { vendorId: shop.id, action: "TRIAL_ACTIVATED" } })).toBe(0);
  });

  it("expires a trial by authoritative time without deleting shop resources or duplicating audit", async () => {
    const { shop } = await vendor("Expiry");
    const trial = await VendorSubscriptionLifecycleService.activateTrial("expiry", days(-15));
    await prisma.product.create({ data: { vendorId: shop.id, name: "Preserved", slug: randomUUID(), basePrice: 1_000, status: "ACTIVE" } });
    await SubscriptionScheduler.run(now);
    await SubscriptionScheduler.run(now);
    expect((await prisma.vendorTrial.findUniqueOrThrow({ where: { id: trial.id } })).status).toBe("EXPIRED");
    expect(await prisma.product.count({ where: { vendorId: shop.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { vendorId: shop.id, action: "TRIAL_EXPIRED" } })).toBe(1);
  });

  it("does not require merchant payout readiness and does not create money movement", async () => {
    await vendor("No payout account");
    await VendorSubscriptionLifecycleService.activateTrial("no-payment", now);
    expect(await prisma.platformRevenueOrder.count()).toBe(0);
    expect(await prisma.platformPaymentIntent.count()).toBe(0);
  });

  it("records renewal eligibility idempotently without charging or replacing the subscription", async () => {
    const { shop } = await vendor("Renewal");
    const current = await paid(shop.id);
    const intent = await VendorSubscriptionLifecycleService.establishRenewalEligibility("renew-1", now);
    const retry = await VendorSubscriptionLifecycleService.establishRenewalEligibility("renew-1", now);
    expect(retry.id).toBe(intent.id);
    expect(intent).toMatchObject({ subscriptionId: current.subscription.id, type: "RENEWAL", status: "PENDING", effectiveAt: days(28) });
    expect(await prisma.vendorSubscription.count({ where: { vendorId: shop.id } })).toBe(1);
    expect(await prisma.platformPaymentIntent.count()).toBe(0);
  });

  it("schedules and replaces plan changes while retaining the current paid entitlement", async () => {
    const { shop } = await vendor("Plan change");
    await paid(shop.id);
    await plan("GROWTH", 60_000);
    await plan("PREMIUM", 120_000);
    const growth = await VendorSubscriptionLifecycleService.requestPlanChange("GROWTH", "growth-change", now);
    expect((await VendorEntitlementService.getForShop(shop.id, now)).plan?.code).toBe("STARTER");
    const premium = await VendorSubscriptionLifecycleService.requestPlanChange("PREMIUM", "premium-change", now);
    expect(growth.type).toBe("UPGRADE");
    expect(premium.type).toBe("UPGRADE");
    expect((await prisma.subscriptionLifecycleIntent.findUniqueOrThrow({ where: { id: growth.id } })).status).toBe("CANCELLED");
    expect((await VendorSubscriptionLifecycleService.cancelPlanChange())?.status).toBe("CANCELLED");
    expect(await VendorSubscriptionLifecycleService.cancelPlanChange()).toBeNull();
  });

  it("cancels only at period end and repeated requests do not duplicate audit", async () => {
    const { shop } = await vendor("Cancellation");
    const current = await paid(shop.id);
    const cancelled = await VendorSubscriptionLifecycleService.cancelAtPeriodEnd(now);
    await VendorSubscriptionLifecycleService.cancelAtPeriodEnd(now);
    expect(cancelled).toMatchObject({ id: current.subscription.id, status: "CANCELLED", currentPeriodEnd: days(28) });
    expect((await VendorEntitlementService.getForShop(shop.id, now)).state).toBe("CANCELLED_BUT_ACTIVE");
    expect(await prisma.auditLog.count({ where: { vendorId: shop.id, action: "SUBSCRIPTION_CANCELLATION_REQUESTED" } })).toBe(1);
  });

  it("enforces owner authority and vendor isolation", async () => {
    const first = await vendor("First");
    await paid(first.shop.id);
    const second = await vendor("Second");
    const staff = await prisma.user.create({ data: { name: "Staff", email: `${randomUUID()}@test.local`, status: "ACTIVE", vendorId: first.shop.id, vendorRole: "STAFF" } });
    session.userId = staff.id;
    await expect(VendorSubscriptionLifecycleService.cancelAtPeriodEnd(now)).rejects.toThrow("Vendor permission denied");
    session.userId = second.owner.id;
    await expect(VendorSubscriptionLifecycleService.cancelAtPeriodEnd(now)).rejects.toMatchObject({ code: "ACTIVE_SUBSCRIPTION_REQUIRED" });
    expect((await prisma.vendorSubscription.findFirstOrThrow({ where: { vendorId: first.shop.id } })).status).toBe("ACTIVE");
  });
});
