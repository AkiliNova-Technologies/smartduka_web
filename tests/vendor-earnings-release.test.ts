import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";

const mocks = vi.hoisted(() => ({
  findSubOrder: vi.fn(),
  findLedger: vi.fn(),
  createLedger: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    subOrder: { findUnique: mocks.findSubOrder },
    financialLedger: { findFirst: mocks.findLedger, create: mocks.createLedger },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/vendor/vendor-context", () => ({ VendorContext: { getVendorId: vi.fn() } }));

import {
  isSubOrderEligibleForEarningsRelease,
  MarketplaceEconomicsService,
} from "@/services/marketplace-economics";

const pending = {
  id: "pending-1", vendorId: "vendor-a", orderId: "order-1", paymentAttemptId: "attempt-1",
  amount: new Decimal("95"), currency: "UGX",
};
const subOrder = (overrides: Record<string, unknown> = {}) => ({
  id: "suborder-1", vendorId: "vendor-a", orderId: "order-1", status: "DELIVERED",
  vendorNetEntitlement: new Decimal("95"), order: { paymentStatus: "COMPLETED" }, ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findSubOrder.mockResolvedValue(subOrder());
  mocks.findLedger.mockResolvedValue(pending);
  mocks.createLedger.mockResolvedValue({ id: "created" });
  mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
    financialLedger: { create: mocks.createLedger, findFirst: mocks.findLedger },
  }));
});

describe("Phase 3G vendor earnings release", () => {
  it.each([
    ["paid delivered", "DELIVERED", "COMPLETED", true],
    ["paid processing", "PROCESSING", "COMPLETED", false],
    ["paid shipped", "SHIPPED", "COMPLETED", false],
    ["unpaid delivered", "DELIVERED", "PENDING", false],
    ["reversed delivered", "DELIVERED", "REVERSED", false],
    ["cancelled", "CANCELLED", "COMPLETED", false],
  ])("is eligible only when %s", (_label, status, paymentStatus, eligible) => {
    expect(isSubOrderEligibleForEarningsRelease({ status, order: { paymentStatus } })).toBe(eligible);
  });

  it("atomically reclassifies the immutable pending allocation using its historical amount and currency", async () => {
    await expect(MarketplaceEconomicsService.releaseVendorEarningsForSubOrder("suborder-1")).resolves.toEqual({ released: true });

    const [pendingDebit, availableCredit] = mocks.createLedger.mock.calls.map(([input]) => input.data);
    expect(pendingDebit).toMatchObject({
      vendorId: "vendor-a", orderId: "order-1", subOrderId: "suborder-1", paymentAttemptId: "attempt-1",
      type: "SALE_RELEASE", walletBucket: "PENDING", amount: new Decimal("-95"), currency: "UGX",
    });
    expect(availableCredit).toMatchObject({
      vendorId: "vendor-a", orderId: "order-1", subOrderId: "suborder-1", paymentAttemptId: "attempt-1",
      type: "SALE_AVAILABLE", walletBucket: "AVAILABLE", amount: new Decimal("95"), currency: "UGX",
    });
    const entries = [new Decimal("95"), pendingDebit.amount, availableCredit.amount];
    expect(entries[0].plus(entries[1])).toEqual(new Decimal(0));
    expect(availableCredit.amount).toEqual(new Decimal("95"));
    expect(entries.reduce((sum, amount) => sum.plus(amount), new Decimal(0))).toEqual(new Decimal("95"));
  });

  it("does not release unpaid, reversed, cancelled, processing, or shipped SubOrders", async () => {
    for (const candidate of [
      subOrder({ status: "PROCESSING" }), subOrder({ status: "SHIPPED" }), subOrder({ status: "CANCELLED" }),
      subOrder({ order: { paymentStatus: "PENDING" } }), subOrder({ order: { paymentStatus: "REVERSED" } }),
    ]) {
      mocks.findSubOrder.mockResolvedValueOnce(candidate);
      await expect(MarketplaceEconomicsService.releaseVendorEarningsForSubOrder(candidate.id)).resolves.toEqual({ released: false });
    }
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not fabricate an available balance when the pending allocation is missing", async () => {
    mocks.findLedger.mockResolvedValue(null);
    await expect(MarketplaceEconomicsService.releaseVendorEarningsForSubOrder("suborder-1")).resolves.toEqual({ released: false, missingPendingAllocation: true });
    expect(mocks.createLedger).not.toHaveBeenCalled();
  });

  it("uses the stored pending allocation rather than current economics or shipping", async () => {
    mocks.findSubOrder.mockResolvedValue(subOrder({ vendorNetEntitlement: new Decimal("95"), platformCommission: new Decimal("5"), vendorShipping: new Decimal("3500") }));
    await MarketplaceEconomicsService.releaseVendorEarningsForSubOrder("suborder-1");
    expect(mocks.createLedger.mock.calls[1][0].data.amount).toEqual(new Decimal("95"));
  });

  it("recovers the P2002 race loser only when both transfer legs already exist", async () => {
    mocks.createLedger.mockRejectedValue({ code: "P2002", meta: { target: ["subOrderId", "paymentAttemptId", "type"] } });
    mocks.findLedger
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce({ id: "release-debit" })
      .mockResolvedValueOnce({ id: "release-credit" });

    await expect(MarketplaceEconomicsService.releaseVendorEarningsForSubOrder("suborder-1")).resolves.toEqual({ released: true });
    expect(mocks.findLedger).toHaveBeenCalledTimes(3);
  });

  it("does not swallow a partial or unrelated P2002", async () => {
    const intended = { code: "P2002", meta: { target: ["subOrderId", "paymentAttemptId", "type"] } };
    mocks.createLedger.mockRejectedValue(intended);
    mocks.findLedger.mockResolvedValueOnce(pending).mockResolvedValueOnce({ id: "release-debit" }).mockResolvedValueOnce(null);
    await expect(MarketplaceEconomicsService.releaseVendorEarningsForSubOrder("suborder-1")).rejects.toBe(intended);

    const unrelated = { code: "P2002", meta: { target: ["reference"] } };
    mocks.createLedger.mockRejectedValue(unrelated);
    mocks.findLedger.mockResolvedValueOnce(pending);
    await expect(MarketplaceEconomicsService.releaseVendorEarningsForSubOrder("suborder-1")).rejects.toBe(unrelated);
  });

  it("keeps both transfer legs in one transaction so a failed credit cannot commit a partial release", async () => {
    const failure = new Error("available credit write failed");
    mocks.createLedger.mockResolvedValueOnce({}).mockRejectedValueOnce(failure);

    await expect(MarketplaceEconomicsService.releaseVendorEarningsForSubOrder("suborder-1")).rejects.toBe(failure);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.createLedger).toHaveBeenCalledTimes(2);
  });

  it("releases only the delivered SubOrder in a multi-vendor order", async () => {
    mocks.findSubOrder.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === "a" ? subOrder({ id: "a", vendorId: "vendor-a" }) : subOrder({ id: "b", vendorId: "vendor-b", status: "SHIPPED" }));
    await MarketplaceEconomicsService.releaseVendorEarningsForSubOrder("a");
    await expect(MarketplaceEconomicsService.releaseVendorEarningsForSubOrder("b")).resolves.toEqual({ released: false });
    expect(mocks.createLedger).toHaveBeenCalledTimes(2);
    expect(mocks.createLedger.mock.calls[0][0].data.vendorId).toBe("vendor-a");
  });
});
