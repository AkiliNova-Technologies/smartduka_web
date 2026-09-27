/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";
const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  tx: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    financialLedger: { findMany: mocks.findMany },
    $transaction: mocks.tx,
  },
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/auth/vendor-context", () => ({ requireVendorContext: vi.fn() }));
vi.mock("@/lib/auth/admin-context", () => ({ requireAdminContext: vi.fn() }));
import { ReturnsRefundsService } from "@/services/returns-refunds";
const tx = {
  financialLedger: { findFirst: mocks.findFirst, create: mocks.create },
};
const sale = (type: string) => ({
  vendorId: "vendor",
  orderId: "order",
  subOrderId: "sub",
  paymentAttemptId: "attempt",
  amount: new Decimal("95"),
  currency: "UGX",
  type,
  reference: "sale",
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.tx.mockImplementation((f: Function) => f(tx));
  mocks.findFirst.mockResolvedValue(null);
});
describe("Phase 3K payment reversal ledger idempotency", () => {
  it.each([
    ["SALE_PENDING", "SALE_REVERSAL_PENDING", "PENDING"],
    ["SALE_AVAILABLE", "SALE_REVERSAL_AVAILABLE", "AVAILABLE"],
  ])(
    "adds one compensating %s reversal and retains append-only sale history",
    async (original, reversal, bucket) => {
      mocks.findMany.mockResolvedValue([sale(original)]);
      await ReturnsRefundsService.reversePaymentEarnings("attempt");
      await ReturnsRefundsService.reversePaymentEarnings("attempt");
      mocks.findFirst.mockResolvedValue({ id: "reversal" });
      await ReturnsRefundsService.reversePaymentEarnings("attempt");
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: reversal,
            walletBucket: bucket,
            amount: new Decimal("-95"),
          }),
        }),
      );
      expect(mocks.create).toHaveBeenCalledTimes(2);
      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { in: ["SALE_PENDING", "SALE_AVAILABLE"] },
          }),
        }),
      );
    },
  );
});
