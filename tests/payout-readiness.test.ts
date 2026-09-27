import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";
const mocks = vi.hoisted(() => ({
  payout: vi.fn(),
  aggregate: vi.fn(),
  lots: vi.fn(),
  update: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    vendorPayout: { findUnique: mocks.payout, update: mocks.update },
    financialLedger: { aggregate: mocks.aggregate, findMany: mocks.lots },
    auditLog: { create: mocks.audit },
  },
}));
import {
  eligibleAt,
  PayoutReadinessService,
  VENDOR_PAYOUT_HOLD_DAYS,
} from "@/services/payout-readiness";
const now = new Date("2026-10-01T00:00:00.000Z");
const payout = (overrides: Record<string, unknown> = {}) => ({
  id: "p",
  vendorId: "v",
  amount: new Decimal("50"),
  currency: "UGX",
  status: "APPROVED",
  destinationType: "BANK_ACCOUNT",
  vendor: {
    status: "ACTIVE",
    momoMerchantCode: null,
    bankName: "Bank",
    bankAccountName: "A",
    bankAccountNumber: "1234",
  },
  allocations: [
    {
      status: "ACTIVE",
      vendorId: "v",
      currency: "UGX",
      allocatedAmount: new Decimal("50"),
      earningLedger: lot(),
    },
  ],
  ...overrides,
});
const lot = (overrides: Record<string, unknown> = {}) => ({
  vendorId: "v",
  currency: "UGX",
  paymentAttempt: { status: "COMPLETED" },
  subOrder: {
    deliveryConfirmedAt: new Date("2026-09-24T00:00:00.000Z"),
    deliveryConfirmationSource: "CUSTOMER",
    order: { paymentStatus: "COMPLETED" },
  },
  ...overrides,
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.payout.mockResolvedValue(payout());
  mocks.aggregate.mockResolvedValue({ _sum: { amount: new Decimal("50") } });
  mocks.lots.mockResolvedValue([lot()]);
  mocks.update.mockResolvedValue({
    ...payout(),
    status: "READY_FOR_DISBURSEMENT",
    merchantReference: "SD-PAYOUT-P",
  });
});
describe("Phase 3I payout readiness", () => {
  it("requires approved, trusted delivery after the centralized hold, valid vendor/destination, and matching reserve", async () => {
    await expect(
      PayoutReadinessService.prepareApprovedWithdrawalForDisbursement("p", now),
    ).resolves.toMatchObject({
      eligible: true,
      payout: { status: "READY_FOR_DISBURSEMENT" },
    });
    expect(mocks.aggregate).toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "READY_FOR_DISBURSEMENT" }),
      }),
    );
  });
  it.each([
    ["REQUESTED", payout({ status: "REQUESTED" }), "NOT_APPROVED"],
    [
      "suspended",
      payout({ vendor: { ...payout().vendor, status: "SUSPENDED" } }),
      "VENDOR_SUSPENDED",
    ],
    [
      "invalid destination",
      payout({ vendor: { ...payout().vendor, bankAccountNumber: null } }),
      "DESTINATION_INVALID",
    ],
    ["reserve mismatch", payout(), "FINANCIAL_RESERVATION_MISMATCH"],
  ])("blocks %s", async (_label, p, reason) => {
    mocks.payout.mockResolvedValue(p);
    if (reason === "FINANCIAL_RESERVATION_MISMATCH")
      mocks.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal("49") },
      });
    await expect(
      PayoutReadinessService.evaluateWithdrawalDisbursementEligibility(
        "p",
        now,
      ),
    ).resolves.toMatchObject({ eligible: false, reasons: [reason] });
  });
  it("blocks vendor delivery without independent confirmation, reversals, and active hold", async () => {
    const withLot = (earningLedger: ReturnType<typeof lot>) =>
      payout({
        allocations: [
          {
            status: "ACTIVE",
            vendorId: "v",
            currency: "UGX",
            allocatedAmount: new Decimal("50"),
            earningLedger,
          },
        ],
      });
    mocks.payout.mockResolvedValue(
      withLot(
        lot({
          subOrder: {
            deliveryConfirmedAt: null,
            deliveryConfirmationSource: null,
            order: { paymentStatus: "COMPLETED" },
          },
        }),
      ),
    );
    await expect(
      PayoutReadinessService.evaluateWithdrawalDisbursementEligibility(
        "p",
        now,
      ),
    ).resolves.toMatchObject({ reasons: ["WAITING_FOR_TRUSTED_DELIVERY"] });
    mocks.payout.mockResolvedValue(
      withLot(
        lot({
          subOrder: {
            deliveryConfirmedAt: new Date("2026-09-20"),
            deliveryConfirmationSource: "CUSTOMER",
            order: { paymentStatus: "REVERSED" },
          },
        }),
      ),
    );
    await expect(
      PayoutReadinessService.evaluateWithdrawalDisbursementEligibility(
        "p",
        now,
      ),
    ).resolves.toMatchObject({ reasons: ["EARNING_PAYMENT_REVERSED"] });
    mocks.payout.mockResolvedValue(
      withLot(
        lot({
          subOrder: {
            deliveryConfirmedAt: new Date("2026-09-30"),
            deliveryConfirmationSource: "CUSTOMER",
            order: { paymentStatus: "COMPLETED" },
          },
        }),
      ),
    );
    await expect(
      PayoutReadinessService.evaluateWithdrawalDisbursementEligibility(
        "p",
        now,
      ),
    ).resolves.toMatchObject({ reasons: ["HOLD_PERIOD_ACTIVE"] });
  });
  it("blocks legacy, mismatched, and reversed allocated funding while ignoring unrelated lots", async () => {
    mocks.payout.mockResolvedValue(payout({ allocations: [] }));
    await expect(
      PayoutReadinessService.evaluateWithdrawalDisbursementEligibility(
        "p",
        now,
      ),
    ).resolves.toMatchObject({ reasons: ["EARNING_ALLOCATION_MISSING"] });
    mocks.payout.mockResolvedValue(
      payout({
        allocations: [
          {
            status: "ACTIVE",
            vendorId: "v",
            currency: "UGX",
            allocatedAmount: new Decimal("49"),
            earningLedger: lot(),
          },
        ],
      }),
    );
    await expect(
      PayoutReadinessService.evaluateWithdrawalDisbursementEligibility(
        "p",
        now,
      ),
    ).resolves.toMatchObject({ reasons: ["EARNING_ALLOCATION_MISMATCH"] });
    mocks.payout.mockResolvedValue(
      payout({
        status: "READY_FOR_DISBURSEMENT",
        allocations: [
          {
            status: "ACTIVE",
            vendorId: "v",
            currency: "UGX",
            allocatedAmount: new Decimal("50"),
            earningLedger: lot({ paymentAttempt: { status: "REVERSED" } }),
          },
        ],
      }),
    );
    await expect(
      PayoutReadinessService.evaluateWithdrawalDisbursementEligibility(
        "p",
        now,
      ),
    ).resolves.toMatchObject({
      eligible: false,
      reasons: ["EARNING_PAYMENT_REVERSED"],
    });
    await expect(
      PayoutReadinessService.prepareApprovedWithdrawalForDisbursement("p", now),
    ).resolves.toMatchObject({ eligible: false });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not inspect unrelated reversed lots when evaluating an allocated payout", async () => {
    mocks.payout.mockResolvedValue(payout());
    mocks.lots.mockResolvedValue([
      lot({ paymentAttempt: { status: "REVERSED" } }),
    ]);
    await expect(
      PayoutReadinessService.evaluateWithdrawalDisbursementEligibility(
        "p",
        now,
      ),
    ).resolves.toMatchObject({ eligible: true, reasons: [] });
    expect(mocks.lots).not.toHaveBeenCalled();
  });
  it("uses a seven-day confirmation hold boundary", () => {
    const confirmed = new Date("2026-09-24T00:00:00.000Z");
    expect(VENDOR_PAYOUT_HOLD_DAYS).toBe(7);
    expect(eligibleAt(confirmed)).toEqual(now);
  });
});
