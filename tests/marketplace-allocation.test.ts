import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";

const mocks = vi.hoisted(() => ({
  attempt: vi.fn(),
  order: vi.fn(),
  create: vi.fn(),
  findExistingAllocation: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    paymentAttempt: { findUnique: mocks.attempt },
    order: { findUnique: mocks.order },
    financialLedger: { create: mocks.create },
    $transaction: mocks.transaction,
  },
}));

import { MarketplaceEconomicsService } from "@/services/marketplace-economics";

const sub = (id: string, vendorId: string, net = "95") => ({
  id,
  vendorId,
  subOrderNumber: id,
  vendorSubTotal: new Decimal("100"),
  platformCommission: new Decimal("5"),
  paymentProcessingFee: new Decimal("0"),
  vendorNetEntitlement: new Decimal(net),
  commissionRate: new Decimal("5"),
  items: [{ totalPrice: new Decimal("100") }],
});
const paid = (subs: Array<ReturnType<typeof sub>>) => ({
  id: "o",
  paymentStatus: "COMPLETED",
  currency: "UGX",
  subTotal: new Decimal(subs.reduce((total, current) => total + Number(current.vendorSubTotal), 0)),
  subOrders: subs,
});

type TransactionCallback = (client: {
  financialLedger: { create: typeof mocks.create; findFirst: typeof mocks.findExistingAllocation };
}) => Promise<unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.attempt.mockResolvedValue({ id: "p", orderId: "o", status: "COMPLETED", orderCompletedAt: new Date() });
  mocks.findExistingAllocation.mockResolvedValue({ id: "existing-allocation" });
  mocks.transaction.mockImplementation(async (callback: TransactionCallback) => callback({
    financialLedger: { create: mocks.create, findFirst: mocks.findExistingAllocation },
  }));
});

describe("Phase 3F allocation", () => {
  it("creates one fully attributed pending liability equal to the vendor net entitlement", async () => {
    mocks.order.mockResolvedValue(paid([sub("s1", "a")]));
    mocks.create.mockResolvedValue({});

    await MarketplaceEconomicsService.allocatePaidOrderEconomics("o", "p");

    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        vendorId: "a", orderId: "o", subOrderId: "s1", paymentAttemptId: "p",
        currency: "UGX", type: "SALE_PENDING", walletBucket: "PENDING", amount: new Decimal("95"),
      }),
    });
  });

  it("recovers the intended unique conflict only after confirming the matching allocation", async () => {
    mocks.order.mockResolvedValue(paid([sub("s1", "a")]));
    mocks.create.mockRejectedValue({ code: "P2002", meta: { target: ["subOrderId", "paymentAttemptId", "type"] } });

    await expect(MarketplaceEconomicsService.allocatePaidOrderEconomics("o", "p")).resolves.toEqual({ allocated: true });
    expect(mocks.findExistingAllocation).toHaveBeenCalledWith({
      where: { subOrderId: "s1", paymentAttemptId: "p", type: "SALE_PENDING" },
      select: { id: true },
    });
  });

  it("does not swallow an intended-constraint conflict when no matching allocation can be found", async () => {
    const conflict = { code: "P2002", meta: { target: ["subOrderId", "paymentAttemptId", "type"] } };
    mocks.order.mockResolvedValue(paid([sub("s1", "a")]));
    mocks.create.mockRejectedValue(conflict);
    mocks.findExistingAllocation.mockResolvedValue(null);

    await expect(MarketplaceEconomicsService.allocatePaidOrderEconomics("o", "p")).rejects.toBe(conflict);
  });

  it("rethrows unrelated unique conflicts", async () => {
    const conflict = { code: "P2002", meta: { target: ["reference"] } };
    mocks.order.mockResolvedValue(paid([sub("s1", "a")]));
    mocks.create.mockRejectedValue(conflict);

    await expect(MarketplaceEconomicsService.allocatePaidOrderEconomics("o", "p")).rejects.toBe(conflict);
    expect(mocks.findExistingAllocation).not.toHaveBeenCalled();
  });

  it("repairs a partial multi-vendor allocation without duplicating the existing vendor", async () => {
    mocks.order.mockResolvedValue(paid([sub("s1", "a"), sub("s2", "b")]));
    mocks.create
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["subOrderId", "paymentAttemptId", "type"] } })
      .mockResolvedValueOnce({ id: "new-b" });

    await expect(MarketplaceEconomicsService.allocatePaidOrderEconomics("o", "p")).resolves.toEqual({ allocated: true });
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(mocks.create.mock.calls[1][0].data).toMatchObject({ vendorId: "b", subOrderId: "s2", amount: new Decimal("95") });
  });

  // This unit test exercises the actual P2002 recovery branch; it does not claim to simulate two PostgreSQL connections.
  it("handles the race loser as an idempotent success when the database reports the allocation already exists", async () => {
    mocks.order.mockResolvedValue(paid([sub("s1", "a")]));
    mocks.create.mockRejectedValue({ code: "P2002", meta: { target: ["subOrderId", "paymentAttemptId", "type"] } });

    await expect(MarketplaceEconomicsService.allocatePaidOrderEconomics("o", "p")).resolves.toEqual({ allocated: true });
  });

  it("allocates only the completion-winning completed attempt", async () => {
    mocks.attempt.mockResolvedValue({ id: "p", orderId: "o", status: "COMPLETED", orderCompletedAt: null });

    await expect(MarketplaceEconomicsService.allocatePaidOrderEconomics("o", "p")).resolves.toEqual({ allocated: false });
    expect(mocks.order).not.toHaveBeenCalled();
  });

  it.each(["FAILED", "INITIATED", "SUBMISSION_UNKNOWN", "REVERSED"])("rejects non-completed %s attempts", async (status) => {
    mocks.attempt.mockResolvedValue({ id: "p", orderId: "o", status, orderCompletedAt: new Date() });

    await expect(MarketplaceEconomicsService.allocatePaidOrderEconomics("o", "p")).resolves.toEqual({ allocated: false });
    expect(mocks.order).not.toHaveBeenCalled();
  });
});
