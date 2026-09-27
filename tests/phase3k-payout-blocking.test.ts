/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";
const mocks = vi.hoisted(() => ({
  payout: vi.fn(),
  aggregate: vi.fn(),
  admin: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    vendorPayout: { findUnique: mocks.payout },
    financialLedger: { aggregate: mocks.aggregate },
  },
}));
vi.mock("@/lib/auth/admin-context", () => ({
  requireAdminContext: mocks.admin,
}));
import { PayoutReadinessService } from "@/services/payout-readiness";
import { VendorWithdrawalService } from "@/services/vendor-withdrawal";
const lot = (x: any = {}) => ({
  vendorId: "vendor",
  currency: "UGX",
  paymentAttempt: { status: "COMPLETED" },
  subOrder: {
    deliveryConfirmedAt: new Date("2026-01-01"),
    deliveryConfirmationSource: "CUSTOMER",
    order: { paymentStatus: "COMPLETED" },
    returnRequests: [],
    refunds: [],
  },
  ...x,
});
const payout = (lots: any[]) => ({
  id: "payout-a",
  vendorId: "vendor",
  amount: new Decimal("30000"),
  currency: "UGX",
  status: "APPROVED",
  destinationType: "BANK_ACCOUNT",
  vendor: {
    status: "ACTIVE",
    bankName: "bank",
    bankAccountName: "name",
    bankAccountNumber: "123",
    momoMerchantCode: null,
  },
  allocations: lots.map((earningLedger, i) => ({
    status: "ACTIVE",
    vendorId: "vendor",
    currency: "UGX",
    allocatedAmount: new Decimal("30000"),
    earningLedger: { id: `lot-${i}`, ...earningLedger },
  })),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.aggregate.mockResolvedValue({ _sum: { amount: new Decimal("30000") } });
});
describe("Phase 3K exact-lot payout blocking", () => {
  it.each([
    [
      "refund",
      lot({ subOrder: { ...lot().subOrder, refunds: [{ id: "refund" }] } }),
      "REFUND_PENDING",
    ],
    [
      "return",
      lot({
        subOrder: { ...lot().subOrder, returnRequests: [{ id: "return" }] },
      }),
      "RETURN_PENDING",
    ],
    [
      "reversal",
      lot({ paymentAttempt: { status: "REVERSED" } }),
      "EARNING_PAYMENT_REVERSED",
    ],
  ])("blocks only Lot A for an active %s", async (_label, blocked, reason) => {
    mocks.payout.mockResolvedValue(payout([blocked]));
    await expect(
      PayoutReadinessService.evaluateWithdrawalDisbursementEligibility(
        "payout-a",
        new Date("2026-01-10"),
      ),
    ).resolves.toMatchObject({ eligible: false, reasons: [reason] });
    mocks.payout.mockResolvedValue(payout([lot()]));
    await expect(
      PayoutReadinessService.evaluateWithdrawalDisbursementEligibility(
        "payout-b",
        new Date("2026-01-10"),
      ),
    ).resolves.toMatchObject({ eligible: true, reasons: [] });
  });
  it("reports exact Decimal reversal exposure for affected allocations only", async () => {
    mocks.payout.mockResolvedValue({
      id: "p",
      allocations: [
        {
          status: "ACTIVE",
          allocatedAmount: new Decimal("30000"),
          earningLedger: { paymentAttempt: { status: "REVERSED" } },
        },
        {
          status: "ACTIVE",
          allocatedAmount: new Decimal("50000"),
          earningLedger: { paymentAttempt: { status: "COMPLETED" } },
        },
      ],
    });
    const funding: any =
      await VendorWithdrawalService.inspectPayoutFundingForCurrentAdmin("p");
    expect(funding.reversalExposure.toString()).toBe("30000");
  });
});
