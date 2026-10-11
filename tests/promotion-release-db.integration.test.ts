import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ actor: "", adminId: "" }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: async () => auth.actor }));
vi.mock("@/lib/auth/admin-context", () => ({ requireAdminContext: async () => ({ userId: auth.adminId }) }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn(), revalidateTag: vi.fn() }));

import { prisma } from "@/lib/prisma/client";
import { MarketingService } from "@/services/marketing";
import { PlatformPaymentReconciliationService } from "@/services/platform-payment-reconciliation";
import { PlatformPaymentService } from "@/services/platform-payment";
import { PromotionCampaignScheduler } from "@/services/promotion-campaign-scheduler";
import { PromotionCapacityError, PromotionCapacityReductionError, PromotionInventoryService } from "@/services/promotion-inventory";
import { VendorPromotionsService } from "@/services/vendor-promotions";
import { FakeMtnProvider } from "./support/fake-mtn-provider";

const enabled = process.env.RUN_PROMOTION_DB_TESTS === "1";
const DAY = 86_400_000;
type Seed = { userId: string; vendorId: string; productId: string };

function gate(parties: number) {
  let count = 0, open = false, release!: () => void;
  const ready = new Promise<void>((resolve) => { release = resolve; });
  return async () => { if (open) return; count += 1; if (count === parties) { open = true; release(); } await ready; };
}

async function reset() {
  const configuredUrl = process.env.DATABASE_URL;
  if (process.env.PROMOTION_TEST_DATABASE !== "isolated-local" || !configuredUrl) throw new Error("Refusing destructive setup without the isolated promotion-test database marker.");
  const databaseUrl = new URL(configuredUrl);
  const localHost = databaseUrl.hostname === "127.0.0.1" || databaseUrl.hostname === "localhost" || databaseUrl.hostname === "::1";
  const isolatedName = databaseUrl.pathname === "/mwezora_promotion_tests";
  if (!localHost || !isolatedName) throw new Error("Refusing destructive setup outside the local mwezora_promotion_tests database.");
  await prisma.platformPaymentIntent.deleteMany();
  await prisma.platformRevenueOrder.deleteMany();
  await prisma.promotionCreditLedger.deleteMany();
  await prisma.promotionReservation.deleteMany();
  await prisma.promotionCampaign.deleteMany();
  await prisma.promotionQuote.deleteMany();
  await prisma.featuredProduct.deleteMany();
  await prisma.featuredShop.deleteMany();
  await prisma.product.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.vendorProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.advertisingPlacementInventory.updateMany({ data: { capacity: 2, isActive: true } });
}

async function seedVendor(index: number): Promise<Seed> {
  const userId = randomUUID(), vendorId = randomUUID(), productId = randomUUID(), now = new Date();
  await prisma.user.create({ data: { id: userId, name: `Vendor ${index}`, email: `release-vendor-${index}@example.test`, status: "ACTIVE", vendorRole: "OWNER" } });
  await prisma.vendorProfile.create({ data: { id: vendorId, ownerId: userId, storeName: `Release Shop ${index}`, slug: `release-shop-${index}`, status: "ACTIVE", trialStartedAt: now, trialEndsAt: new Date(now.getTime() + 30 * DAY) } });
  await prisma.product.create({ data: { id: productId, vendorId, name: `Release Product ${index}`, slug: `release-product-${index}`, basePrice: 25_000, inventoryCount: 10, status: "ACTIVE" } });
  return { userId, vendorId, productId };
}

async function createCampaign(seed: Seed, startAt: Date, endAt: Date, options: { id?: string; status?: "AWAITING_PAYMENT"|"SCHEDULED"|"ACTIVE"; fulfillmentStatus?: "PENDING_PAYMENT"|"CONFIRMED"|"DELIVERING"; amountDue?: number; creditApplied?: number; targetType?: "PRODUCT"|"SHOP" } = {}) {
  const targetType = options.targetType ?? "PRODUCT", id = options.id ?? randomUUID();
  return prisma.promotionCampaign.create({ data: { id, vendorId: seed.vendorId, targetType, productId: targetType === "PRODUCT" ? seed.productId : null, dailyRate: 10_000, durationDays: Math.round((endAt.getTime() - startAt.getTime()) / DAY), subtotal: (options.amountDue ?? 0) + (options.creditApplied ?? 0), creditApplied: options.creditApplied ?? 0, amountDue: options.amountDue ?? 0, requestedStartAt: startAt, startAt, endAt, placement: PromotionInventoryService.placementFor(targetType), status: options.status ?? "SCHEDULED", fulfillmentStatus: options.fulfillmentStatus ?? "CONFIRMED" } });
}

async function reserve(seed: Seed, startAt: Date, endAt: Date, sync?: () => Promise<void>, observedPids?: number[]) {
  const id = randomUUID();
  return PromotionInventoryService.runSerializable(async (tx) => {
    const backend = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
    observedPids?.push(backend[0].pid);
    if (sync) await sync();
    await tx.promotionCampaign.create({ data: { id, vendorId: seed.vendorId, targetType: "PRODUCT", productId: seed.productId, dailyRate: 10_000, durationDays: 1, subtotal: 10_000, creditApplied: 10_000, amountDue: 0, requestedStartAt: startAt, startAt, endAt, placement: "HOMEPAGE_FEATURED_PRODUCTS", status: "SCHEDULED", fulfillmentStatus: "CONFIRMED" } });
    await PromotionInventoryService.assertAndReserve(tx, { campaignId: id, placement: "HOMEPAGE_FEATURED_PRODUCTS", startAt, endAt, status: "CONFIRMED" });
    return { id, pid: backend[0].pid };
  });
}

async function awaitingPayment(seed: Seed, durationDays = 3, applyCredit = false) {
  auth.actor = seed.userId;
  const quote = await VendorPromotionsService.quote({ targetType: "PRODUCT", targetId: seed.productId, durationDays, applyCredit });
  const campaign = await VendorPromotionsService.create({ quoteId: quote.quoteId, idempotencyKey: randomUUID() });
  return { quote, campaign };
}

describe.runIf(enabled).sequential("promotion release qualification against isolated PostgreSQL", () => {
  beforeEach(reset);
  afterAll(async () => { await prisma.$disconnect(); });

  it("serializes separate connections competing for the final slot and honors half-open intervals", async () => {
    const [a, b] = await Promise.all([seedVendor(1), seedVendor(2)]);
    await prisma.advertisingPlacementInventory.update({ where: { placement: "HOMEPAGE_FEATURED_PRODUCTS" }, data: { capacity: 1 } });
    const start = new Date("2026-11-01T08:00:00.000Z"), end = new Date("2026-11-02T08:00:00.000Z"), wait = gate(2), observedPids:number[]=[];
    const results = await Promise.allSettled([reserve(a, start, end, wait,observedPids), reserve(b, start, end, wait,observedPids)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(new Set(observedPids).size).toBeGreaterThanOrEqual(2);
    const persisted = await prisma.promotionReservation.findMany({ where: { status: "CONFIRMED" }, include: { campaign: true } });
    expect(persisted).toHaveLength(1);
    expect(await prisma.promotionCampaign.count()).toBe(1);
    const winnerPid = (results.find((result) => result.status === "fulfilled") as PromiseFulfilledResult<{ id: string; pid: number }>).value.pid;
    expect(winnerPid).toBeTypeOf("number");
    await expect(reserve(b, new Date(start.getTime() + DAY / 2), new Date(end.getTime() + DAY / 2))).rejects.toBeInstanceOf(PromotionCapacityError);
    await expect(reserve(b, end, new Date(end.getTime() + DAY))).resolves.toBeTruthy();
    expect(await prisma.promotionReservation.count({ where: { status: "CONFIRMED" } })).toBe(2);
  }, 30_000);

  it("atomically spends shared promotional credit and deduplicates concurrent submissions", async () => {
    const vendor = await seedVendor(3); auth.actor = vendor.userId;
    const productQuote = await VendorPromotionsService.quote({ targetType: "PRODUCT", targetId: vendor.productId, durationDays: 2, applyCredit: true });
    const shopQuote = await VendorPromotionsService.quote({ targetType: "SHOP", durationDays: 1, applyCredit: true });
    const competing = await Promise.allSettled([
      VendorPromotionsService.create({ quoteId: productQuote.quoteId, idempotencyKey: randomUUID() }),
      VendorPromotionsService.create({ quoteId: shopQuote.quoteId, idempotencyKey: randomUUID() }),
    ]);
    expect(competing.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.promotionCampaign.count()).toBe(1);
    expect(await prisma.platformRevenueOrder.count({ where: { status: "PAID" } })).toBe(1);
    expect(await prisma.promotionReservation.count({ where: { status: "CONFIRMED" } })).toBe(1);
    const balance = await prisma.promotionCreditLedger.aggregate({ where: { vendorId: vendor.vendorId }, _sum: { amount: true } });
    expect(Number(balance._sum.amount)).toBe(10_000);

    await reset();
    const duplicateVendor = await seedVendor(4); auth.actor = duplicateVendor.userId;
    const quote = await VendorPromotionsService.quote({ targetType: "PRODUCT", targetId: duplicateVendor.productId, durationDays: 1, applyCredit: true });
    const key = randomUUID(), duplicate = await Promise.all([
      VendorPromotionsService.create({ quoteId: quote.quoteId, idempotencyKey: key }),
      VendorPromotionsService.create({ quoteId: quote.quoteId, idempotencyKey: key }),
    ]);
    expect(duplicate[0].id).toBe(duplicate[1].id);
    expect(await prisma.promotionCampaign.count()).toBe(1);
    expect(await prisma.promotionCreditLedger.count({ where: { type: "REDEMPTION" } })).toBe(1);
  }, 30_000);

  it("runs booking through duplicate payment confirmation, sponsored delivery and expiry", async () => {
    const vendor = await seedVendor(5), { campaign } = await awaitingPayment(vendor, 3, false);
    const intent = await prisma.platformPaymentIntent.create({ data: { platformRevenueOrderId: campaign.revenueOrderId, vendorId: vendor.vendorId, provider: "MTN_MOMO", amount: campaign.amountDue, status: "PENDING", providerReference: randomUUID(), idempotencyKey: randomUUID() } });
    const confirmations = await Promise.all([
      PlatformPaymentReconciliationService.applyTrustedResult(intent.id, "SUCCESSFUL", String(campaign.amountDue), "UGX"),
      PlatformPaymentReconciliationService.applyTrustedResult(intent.id, "SUCCESSFUL", String(campaign.amountDue), "UGX"),
    ]);
    expect(confirmations.map((result) => result.outcome).sort()).toEqual(["IGNORED_STALE", "TRANSITION_APPLIED"]);
    const saved = await prisma.promotionCampaign.findUniqueOrThrow({ where: { id: campaign.id }, include: { reservation: true, revenueOrder: true } });
    expect(saved.status).toBe("ACTIVE");
    expect(saved.fulfillmentStatus).toBe("DELIVERING");
    expect(saved.reservation?.status).toBe("CONFIRMED");
    expect(saved.revenueOrder?.status).toBe("PAID");
    expect(saved.endAt!.getTime() - saved.startAt!.getTime()).toBe(3 * DAY);
    const featured = await MarketingService.publicFeaturedProducts();
    expect(featured).toEqual(expect.arrayContaining([expect.objectContaining({ id: vendor.productId, sponsored: true })]));
    const expiredEnd=new Date(Date.now()-1_000),expiredStart=new Date(expiredEnd.getTime()-3*DAY);
    await prisma.promotionCampaign.update({ where: { id: campaign.id }, data: { startAt:expiredStart,endAt:expiredEnd } });
    await prisma.promotionReservation.update({ where: { campaignId: campaign.id }, data: { startAt:expiredStart,endAt:expiredEnd } });
    await PromotionCampaignScheduler.run();
    expect((await prisma.promotionCampaign.findUniqueOrThrow({ where: { id: campaign.id } })).status).toBe("COMPLETED");
    expect(await MarketingService.publicFeaturedProducts()).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: vendor.productId })]));
  }, 30_000);

  it("keeps cancellation consistent when racing payment initiation and confirmation", async () => {
    const vendor = await seedVendor(6), first = await awaitingPayment(vendor, 2, false); auth.actor = vendor.userId;
    const initiated = await Promise.allSettled([
      VendorPromotionsService.cancel(first.campaign.id),
      PlatformPaymentService.initiate({ vendorId: vendor.vendorId, revenueOrderId: first.campaign.revenueOrderId, payerPhone: "256772123456", idempotencyKey: randomUUID() }, new FakeMtnProvider("PENDING")),
    ]);
    expect(initiated.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const firstSaved = await prisma.promotionCampaign.findUniqueOrThrow({ where: { id: first.campaign.id }, include: { reservation: true, revenueOrder: { include: { paymentIntents: true } } } });
    expect(firstSaved.status === "CANCELLED" ? firstSaved.revenueOrder?.paymentIntents.length === 0 : firstSaved.revenueOrder?.paymentIntents[0]?.status === "PENDING").toBe(true);

    await reset();
    const secondVendor = await seedVendor(7), second = await awaitingPayment(secondVendor, 2, false); auth.actor = secondVendor.userId;
    const intent = await prisma.platformPaymentIntent.create({ data: { platformRevenueOrderId: second.campaign.revenueOrderId, vendorId: secondVendor.vendorId, provider: "MTN_MOMO", amount: second.campaign.amountDue, status: "PENDING", providerReference: randomUUID(), idempotencyKey: randomUUID() } });
    const race = await Promise.allSettled([
      VendorPromotionsService.cancel(second.campaign.id),
      PlatformPaymentReconciliationService.applyTrustedResult(intent.id, "SUCCESSFUL", String(second.campaign.amountDue), "UGX"),
    ]);
    expect(race.some((result) => result.status === "rejected")).toBe(true);
    const secondSaved = await prisma.promotionCampaign.findUniqueOrThrow({ where: { id: second.campaign.id }, include: { reservation: true, revenueOrder: true } });
    expect(secondSaved.status).toBe("ACTIVE");
    expect(secondSaved.reservation?.status).toBe("CONFIRMED");
    expect(secondSaved.revenueOrder?.status).toBe("PAID");
  }, 30_000);

  it("handles hold expiry, late payment, exact credit restoration and paid recovery", async () => {
    const vendor = await seedVendor(8), late = await awaitingPayment(vendor, 4, true);
    const intent = await prisma.platformPaymentIntent.create({ data: { platformRevenueOrderId: late.campaign.revenueOrderId, vendorId: vendor.vendorId, provider: "MTN_MOMO", amount: late.campaign.amountDue, status: "PENDING", providerReference: randomUUID(), idempotencyKey: randomUUID() } });
    await prisma.promotionReservation.update({ where: { campaignId: late.campaign.id }, data: { holdExpiresAt: new Date(Date.now() - 1_000) } });
    await PromotionCampaignScheduler.run(); await PromotionCampaignScheduler.run();
    expect(await prisma.promotionCreditLedger.count({ where: { releaseKey: `promotion-credit-release:${late.campaign.id}` } })).toBe(1);
    expect(Number((await prisma.promotionCreditLedger.aggregate({ where: { vendorId: vendor.vendorId }, _sum: { amount: true } }))._sum.amount)).toBe(30_000);
    await PlatformPaymentReconciliationService.applyTrustedResult(intent.id, "SUCCESSFUL", String(late.campaign.amountDue), "UGX");
    const recovered = await prisma.promotionCampaign.findUniqueOrThrow({ where: { id: late.campaign.id }, include: { reservation: true, revenueOrder: true } });
    expect(recovered.status).toBe("ACTIVE");
    expect(recovered.endAt!.getTime() - recovered.startAt!.getTime()).toBe(4 * DAY);
    expect(Number((await prisma.promotionCreditLedger.aggregate({ where: { vendorId: vendor.vendorId }, _sum: { amount: true } }))._sum.amount)).toBe(0);

    await reset();
    const [lateVendor, blocker] = await Promise.all([seedVendor(9), seedVendor(10)]);
    await prisma.advertisingPlacementInventory.update({ where: { placement: "HOMEPAGE_FEATURED_PRODUCTS" }, data: { capacity: 1 } });
    const pending = await awaitingPayment(lateVendor, 2, false);
    const lateIntent = await prisma.platformPaymentIntent.create({ data: { platformRevenueOrderId: pending.campaign.revenueOrderId, vendorId: lateVendor.vendorId, provider: "MTN_MOMO", amount: pending.campaign.amountDue, status: "PENDING", providerReference: randomUUID(), idempotencyKey: randomUUID() } });
    await prisma.promotionReservation.update({ where: { campaignId: pending.campaign.id }, data: { holdExpiresAt: new Date(Date.now() - 1_000) } });
    await PromotionCampaignScheduler.run();
    const start = new Date(), end = new Date(start.getTime() + 2 * DAY), blockerCampaign = await createCampaign(blocker, start, end, { status: "ACTIVE", fulfillmentStatus: "DELIVERING" });
    await PromotionInventoryService.runSerializable(async (tx) => { await PromotionInventoryService.assertAndReserve(tx, { campaignId: blockerCampaign.id, placement: "HOMEPAGE_FEATURED_PRODUCTS", startAt: start, endAt: end, status: "CONFIRMED" }); });
    await PlatformPaymentReconciliationService.applyTrustedResult(lateIntent.id, "SUCCESSFUL", String(pending.campaign.amountDue), "UGX");
    const unfulfilled = await prisma.promotionCampaign.findUniqueOrThrow({ where: { id: pending.campaign.id }, include: { reservation: true, revenueOrder: true } });
    expect(unfulfilled.status).toBe("REVIEW_REQUIRED");
    expect(unfulfilled.fulfillmentStatus).toBe("RECOVERY_REQUIRED");
    expect(unfulfilled.revenueOrder?.status).toBe("PAID");
    expect(unfulfilled.reservation?.status).toBe("RECOVERY_REQUIRED");
    await prisma.product.update({ where: { id: blocker.productId }, data: { status: "ARCHIVED" } });
    await PromotionCampaignScheduler.run();
    const ineligible = await prisma.promotionCampaign.findUniqueOrThrow({ where: { id: blockerCampaign.id }, include: { reservation: true } });
    expect(ineligible.fulfillmentStatus).toBe("INELIGIBLE");
    expect(ineligible.reservation?.status).toBe("RECOVERY_REQUIRED");
  }, 30_000);

  it("blocks capacity reductions that would invalidate confirmed commitments", async () => {
    const [a, b] = await Promise.all([seedVendor(11), seedVendor(12)]), start = new Date("2026-12-01T00:00:00.000Z"), end = new Date("2026-12-03T00:00:00.000Z");
    await reserve(a, start, end); await reserve(b, start, end);
    auth.adminId = a.userId;
    await expect(PromotionInventoryService.updateCapacity("HOMEPAGE_FEATURED_PRODUCTS", 1)).rejects.toBeInstanceOf(PromotionCapacityReductionError);
    expect((await prisma.advertisingPlacementInventory.findUniqueOrThrow({ where: { placement: "HOMEPAGE_FEATURED_PRODUCTS" } })).capacity).toBe(2);
    expect(await prisma.promotionReservation.count({ where: { status: "CONFIRMED" } })).toBe(2);
    await expect(PromotionInventoryService.updateCapacity("HOMEPAGE_FEATURED_PRODUCTS", 2)).resolves.toMatchObject({ capacity: 2 });
  }, 30_000);
});
