/* eslint-disable @typescript-eslint/no-explicit-any -- compact in-memory Prisma transaction harness */
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  intent: null as any,
  order: null as any,
  campaign: null as any,
  releases: [] as Array<{ campaignId: string; amount: number; releaseKey: string; reason: string }>,
}));
const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(async () => [{ locked: true }]),
  platformPaymentIntent: {
    findUnique: vi.fn(async () => state.intent ? { ...state.intent, platformRevenueOrder: { ...state.order, campaign: state.campaign ? { ...state.campaign } : null } } : null),
    update: vi.fn(async ({ data }: any) => Object.assign(state.intent, data)),
  },
  platformRevenueOrder: { update: vi.fn(async ({ data }: any) => Object.assign(state.order, data)) },
  promotionCampaign: { update: vi.fn(async ({ data }: any) => Object.assign(state.campaign, data)) },
  promotionReservation: { updateMany: vi.fn(async () => ({ count: 1 })) },
  promotionCreditLedger: {
    upsert: vi.fn(async ({ where, create }: any) => {
      const existing = state.releases.find((entry) => entry.releaseKey === where.releaseKey);
      if (existing) return existing;
      const entry = { campaignId: create.campaignId, amount: Number(create.amount), releaseKey: create.releaseKey, reason: create.reason };
      state.releases.push(entry); return entry;
    }),
  },
}));
vi.mock("@/lib/prisma/client", () => ({ prisma: { ...db, $transaction: async (callback: any) => callback(db) } }));

import { PlatformPaymentReconciliationService } from "@/services/platform-payment-reconciliation";
import { VendorPromotionsService } from "@/services/vendor-promotions";

function pendingCampaign() {
  state.campaign = { id: "campaign-1", status: "AWAITING_PAYMENT", requestedStartAt: null, durationDays: 7 };
  state.order = { id: "revenue-1", status: "AWAITING_PAYMENT", creditApplied: "30000.00", amountDue: "40000.00", campaign: state.campaign };
  state.intent = { id: "intent-1", status: "PENDING", amount: "40000.00", currency: "UGX", vendorId: "vendor-1", platformRevenueOrderId: "revenue-1" };
}
beforeEach(() => { state.intent = null; state.order = null; state.campaign = null; state.releases.length = 0; vi.clearAllMocks(); });

describe("platform revenue expiry runtime", () => {
  it("expires a partially credit-funded campaign without delivery and restores credit exactly once", async () => {
    pendingCampaign();
    await expect(PlatformPaymentReconciliationService.applyTrustedResult("intent-1", "EXPIRED", "40000", "UGX")).resolves.toMatchObject({ outcome: "TRANSITION_APPLIED" });
    expect(state.intent.status).toBe("EXPIRED");
    expect(state.order.status).toBe("CANCELLED");
    expect(state.campaign.status).toBe("PAYMENT_FAILED");
    expect(["SCHEDULED", "ACTIVE", "COMPLETED"]).not.toContain(state.campaign.status);
    expect(state.order.status).not.toBe("PAID");
    expect(state.releases).toEqual([{ campaignId: "campaign-1", amount: 30000, releaseKey: "promotion-credit-release:campaign-1", reason: "PAYMENT_NOT_FUNDED" }]);

    await expect(PlatformPaymentReconciliationService.applyTrustedResult("intent-1", "EXPIRED", "40000", "UGX")).resolves.toMatchObject({ outcome: "IGNORED_STALE" });
    expect(state.releases).toHaveLength(1);
  });

  it("shares the canonical release key across concurrent failure and cancellation triggers", async () => {
    pendingCampaign();
    await Promise.all([
      VendorPromotionsService.releaseCredit(db as never, "campaign-1", "vendor-1", 30000, "PAYMENT_NOT_FUNDED"),
      VendorPromotionsService.releaseCredit(db as never, "campaign-1", "vendor-1", 30000, "CAMPAIGN_CANCELLED"),
    ]);
    expect(state.releases).toHaveLength(1);
    expect(state.releases[0]).toMatchObject({ amount: 30000, releaseKey: "promotion-credit-release:campaign-1" });
  });

  it("restores partial credit once for a terminal failed payment", async () => {
    pendingCampaign();
    await PlatformPaymentReconciliationService.applyTrustedResult("intent-1", "FAILED", "40000", "UGX");
    expect(state.order.status).toBe("FAILED");
    expect(state.campaign.status).toBe("PAYMENT_FAILED");
    expect(state.releases).toHaveLength(1);
    expect(state.releases[0].amount).toBe(30000);
  });

  it("uses the same exactly-once release for an unpaid cancellation", async () => {
    pendingCampaign();
    await VendorPromotionsService.releaseCredit(db as never, "campaign-1", "vendor-1", 30000, "CAMPAIGN_CANCELLED");
    await VendorPromotionsService.releaseCredit(db as never, "campaign-1", "vendor-1", 30000, "CAMPAIGN_CANCELLED");
    expect(state.releases).toEqual([expect.objectContaining({ amount: 30000, releaseKey: "promotion-credit-release:campaign-1" })]);
  });

  it("keeps a fully credit-funded campaign valid because it has no provider payment to expire", async () => {
    state.campaign = { id: "credit-only", status: "ACTIVE", requestedStartAt: null, durationDays: 3 };
    state.order = { id: "credit-order", status: "PAID", creditApplied: "30000.00", amountDue: "0.00", campaign: state.campaign };
    state.intent = null;
    await expect(PlatformPaymentReconciliationService.applyTrustedResult("missing", "EXPIRED", "0", "UGX")).resolves.toMatchObject({ outcome: "IGNORED_STALE" });
    expect(state.campaign.status).toBe("ACTIVE");
    expect(state.order.status).toBe("PAID");
    expect(state.releases).toHaveLength(0);
  });

  it("marks reversals for review without releasing historical promotional credit", async () => {
    pendingCampaign(); state.intent.status = "SUCCESSFUL"; state.order.status = "PAID"; state.campaign.status = "ACTIVE";
    await PlatformPaymentReconciliationService.applyTrustedResult("intent-1", "REVERSED", "40000", "UGX");
    expect(state.order.status).toBe("REVIEW_REQUIRED");
    expect(state.campaign.status).toBe("REVIEW_REQUIRED");
    expect(state.releases).toHaveLength(0);
  });
});
