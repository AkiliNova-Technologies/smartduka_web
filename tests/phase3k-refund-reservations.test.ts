/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";
const mocks = vi.hoisted(() => ({
  tx: vi.fn(),
  sub: vi.fn(),
  refunds: vi.fn(),
  create: vi.fn(),
  attempt: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({ prisma: { $transaction: mocks.tx } }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/auth/vendor-context", () => ({ requireVendorContext: vi.fn() }));
vi.mock("@/lib/auth/admin-context", () => ({ requireAdminContext: vi.fn() }));
import { ReturnsRefundsService } from "@/services/returns-refunds";
const item = {
  id: "item-a",
  productId: "product-a",
  quantity: 6,
  totalPrice: new Decimal("600"),
};
const sub = (x: any = {}) => ({
  id: "sub-a",
  orderId: "order-a",
  platformCommission: new Decimal("60"),
  vendorNetEntitlement: new Decimal("540"),
  order: { customerId: "customer-a", currency: "UGX" },
  items: [item],
  ...x,
});
const tx = {
  subOrder: { findUnique: mocks.sub },
  refund: { findMany: mocks.refunds, create: mocks.create },
  paymentAttempt: { findFirst: mocks.attempt },
};
const intent = {
  subOrderId: "sub-a",
  requestedByUserId: "customer-a",
  reason: "reason",
  items: [{ orderItemId: "item-a", quantity: 4 }],
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.tx.mockImplementation((f: Function) => f(tx));
  mocks.sub.mockResolvedValue(sub());
  mocks.refunds.mockResolvedValue([]);
  mocks.attempt.mockResolvedValue({ id: "attempt" });
  mocks.create.mockImplementation(({ data }: any) => ({
    id: "refund-a",
    ...data,
  }));
});
describe("Phase 3K server-authoritative refund reservations", () => {
  it("uses historical OrderItem and SubOrder snapshots, not changed catalogue or subscription values", async () => {
    const refund: any =
      await ReturnsRefundsService.createRefundReservation(intent);
    expect(refund.amount).toEqual(new Decimal("400"));
    expect(refund.platformCommissionAdjustment).toEqual(new Decimal("40"));
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({
                orderItemId: "item-a",
                quantity: 4,
                grossAmount: new Decimal("400"),
              }),
            ],
          },
        }),
      }),
    );
  });
  it("rejects an item from another SubOrder and cross-customer use", async () => {
    await expect(
      ReturnsRefundsService.createRefundReservation({
        ...intent,
        items: [{ orderItemId: "other", quantity: 1 }],
      }),
    ).rejects.toThrow("not part");
    mocks.sub.mockResolvedValue(
      sub({ order: { customerId: "customer-b", currency: "UGX" } }),
    );
    await expect(
      ReturnsRefundsService.createRefundReservation(intent),
    ).rejects.toThrow("not found");
  });
  it.each(["REQUESTED", "APPROVED", "READY_FOR_PROVIDER_REFUND", "COMPLETED"])(
    "treats %s as capacity-consuming",
    async (status) => {
      mocks.refunds.mockResolvedValue([
        {
          status,
          amount: new Decimal("400"),
          platformCommissionAdjustment: new Decimal("40"),
          vendorLiabilityAdjustment: new Decimal("360"),
          items: [{ orderItemId: "item-a", quantity: 4 }],
        },
      ]);
      await expect(
        ReturnsRefundsService.createRefundReservation(intent),
      ).rejects.toThrow("remaining");
    },
  );
  it("does not let REJECTED consume capacity, retains RefundItem history, and permits reuse", async () => {
    mocks.refunds.mockResolvedValue([]);
    await expect(
      ReturnsRefundsService.createRefundReservation({
        ...intent,
        items: [{ orderItemId: "item-a", quantity: 6 }],
      }),
    ).resolves.toMatchObject({ id: "refund-a" });
    expect(mocks.create).toHaveBeenCalled();
  });
  it("retries P2034, reloads capacity, and refuses a stale over-capacity intent (real two-connection PostgreSQL race not executed)", async () => {
    mocks.tx
      .mockRejectedValueOnce({ code: "P2034" })
      .mockImplementationOnce((f: Function) => {
        mocks.refunds.mockResolvedValue([
          {
            status: "REQUESTED",
            amount: new Decimal("400"),
            platformCommissionAdjustment: new Decimal("40"),
            vendorLiabilityAdjustment: new Decimal("360"),
            items: [{ orderItemId: "item-a", quantity: 4 }],
          },
        ]);
        return f(tx);
      });
    await expect(
      ReturnsRefundsService.createRefundReservation(intent),
    ).rejects.toThrow("remaining");
    expect(mocks.tx).toHaveBeenCalledTimes(2);
  });
});
