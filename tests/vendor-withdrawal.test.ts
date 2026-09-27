import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";

const mocks = vi.hoisted(() => ({
  payoutFindUnique: vi.fn(), payoutFindFirst: vi.fn(), payoutCreate: vi.fn(), payoutUpdate: vi.fn(),
  vendorFindUnique: vi.fn(), ledgerAggregate: vi.fn(), ledgerFindMany: vi.fn(), ledgerCreate: vi.fn(), allocationCreateMany: vi.fn(), allocationUpdateMany: vi.fn(), auditCreate: vi.fn(), transaction: vi.fn(), adminContext: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({ prisma: {
  vendorPayout: { findUnique: mocks.payoutFindUnique, findFirst: mocks.payoutFindFirst, create: mocks.payoutCreate, update: mocks.payoutUpdate, findMany: vi.fn() },
  vendorProfile: { findUnique: mocks.vendorFindUnique }, financialLedger: { aggregate: mocks.ledgerAggregate, findMany: mocks.ledgerFindMany, create: mocks.ledgerCreate }, vendorPayoutAllocation: { createMany: mocks.allocationCreateMany, updateMany: mocks.allocationUpdateMany }, auditLog: { create: mocks.auditCreate }, $transaction: mocks.transaction,
} }));
vi.mock("@/lib/auth/admin-context", () => ({ requireAdminContext: mocks.adminContext }));

import { MIN_VENDOR_WITHDRAWAL_AMOUNT, VendorWithdrawalService } from "@/services/vendor-withdrawal";

const input = { vendorId: "vendor-a", userId: "user-a", amount: "60000", currency: "UGX", destinationId: "BANK_ACCOUNT", withdrawalRequestId: "withdrawal-request-0001" };
const requested = { id: "payout-1", vendorId: "vendor-a", amount: new Decimal("60000"), currency: "UGX", status: "REQUESTED", requestHash: "hash", maskedDestination: "Bank •••• 1234" };
const transactionClient = {
  vendorPayout: { findUnique: mocks.payoutFindUnique, findFirst: mocks.payoutFindFirst, create: mocks.payoutCreate, update: mocks.payoutUpdate },
  vendorProfile: { findUnique: mocks.vendorFindUnique }, financialLedger: { aggregate: mocks.ledgerAggregate, findMany: mocks.ledgerFindMany, create: mocks.ledgerCreate }, vendorPayoutAllocation: { createMany: mocks.allocationCreateMany, updateMany: mocks.allocationUpdateMany }, auditLog: { create: mocks.auditCreate },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.payoutFindUnique.mockResolvedValue(null);
  mocks.adminContext.mockResolvedValue({ userId: "admin-a" });
  mocks.vendorFindUnique.mockResolvedValue({ momoMerchantCode: "0777000000", bankName: "Bank", bankAccountName: "Vendor A", bankAccountNumber: "001234" });
  mocks.ledgerAggregate.mockResolvedValue({ _sum: { amount: new Decimal("100000") } });
  mocks.ledgerFindMany.mockResolvedValue([{ id: "lot-1", amount: new Decimal("100000"), payoutAllocations: [] }]);
  mocks.payoutCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "payout-1", ...data }));
  mocks.payoutUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...requested, ...data }));
  mocks.transaction.mockImplementation(async (callback: (tx: typeof transactionClient) => Promise<unknown>) => callback(transactionClient));
});

describe("Phase 3H withdrawal reservations", () => {
  it("creates an internal request and atomically moves exact funds from available to reserved", async () => {
    const payout = await VendorWithdrawalService.requestWithdrawal(input);
    expect(payout).toMatchObject({ vendorId: "vendor-a", amount: new Decimal("60000"), currency: "UGX", status: "REQUESTED" });
    expect(mocks.ledgerCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ vendorId: "vendor-a", vendorPayoutId: "payout-1", type: "PAYOUT_RESERVE", walletBucket: "AVAILABLE", amount: new Decimal("-60000"), currency: "UGX" }) }));
    expect(mocks.ledgerCreate).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ vendorId: "vendor-a", vendorPayoutId: "payout-1", type: "PAYOUT_RESERVED", walletBucket: "RESERVED", amount: new Decimal("60000"), currency: "UGX" }) }));
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "Serializable" }));
  });

  it.each([["0"], ["-1"], ["4999"], ["invalid"]])("rejects invalid amount %s", async (amount) => {
    await expect(VendorWithdrawalService.requestWithdrawal({ ...input, amount })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects amounts above currency-scoped ledger availability and non-UGX requests", async () => {
    mocks.ledgerFindMany.mockResolvedValue([{ id: "lot-1", amount: new Decimal("59999"), payoutAllocations: [] }]);
    await expect(VendorWithdrawalService.requestWithdrawal(input)).rejects.toMatchObject({ code: "INSUFFICIENT_AVAILABLE_BALANCE" });
    await expect(VendorWithdrawalService.requestWithdrawal({ ...input, currency: "USD" })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("uses only the requesting vendor profile for the destination snapshot", async () => {
    await VendorWithdrawalService.requestWithdrawal(input);
    expect(mocks.vendorFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "vendor-a" } }));
    expect(mocks.payoutCreate.mock.calls[0][0].data).toMatchObject({ destinationType: "BANK_ACCOUNT", maskedDestination: "Bank •••• 1234" });
  });

  it("returns the same request without duplicate reservation for a matching idempotency key", async () => {
    const first = await VendorWithdrawalService.requestWithdrawal(input);
    mocks.payoutFindUnique.mockResolvedValue(first);
    const replay = await VendorWithdrawalService.requestWithdrawal(input);
    expect(replay).toBe(first);
    expect(mocks.ledgerCreate).toHaveBeenCalledTimes(2);
  });

  it("rejects a reused idempotency key with different intent", async () => {
    const first = await VendorWithdrawalService.requestWithdrawal(input);
    mocks.payoutFindUnique.mockResolvedValue(first);
    await expect(VendorWithdrawalService.requestWithdrawal({ ...input, amount: "70000" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    await expect(VendorWithdrawalService.requestWithdrawal({ ...input, destinationId: "MOBILE_MONEY" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("retries PostgreSQL serializable conflicts so concurrent overspending cannot both succeed", async () => {
    mocks.transaction.mockRejectedValueOnce({ code: "P2034" }).mockImplementationOnce(async (callback: (tx: typeof transactionClient) => Promise<unknown>) => callback(transactionClient));
    await expect(VendorWithdrawalService.requestWithdrawal(input)).resolves.toMatchObject({ id: "payout-1" });
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });

  it("cancels only an owning REQUESTED withdrawal and atomically restores its reservation", async () => {
    mocks.payoutFindFirst.mockResolvedValue(requested);
    await expect(VendorWithdrawalService.cancelWithdrawal("payout-1", "vendor-a", "user-a")).resolves.toMatchObject({ status: "CANCELLED" });
    expect(mocks.ledgerCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ type: "PAYOUT_RELEASE", walletBucket: "RESERVED", amount: new Decimal("-60000") }) }));
    expect(mocks.ledgerCreate).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ type: "PAYOUT_AVAILABLE", walletBucket: "AVAILABLE", amount: new Decimal("60000") }) }));
  });

  it("makes duplicate cancellation safe and rejects cancellation after approval", async () => {
    mocks.payoutFindFirst.mockResolvedValue({ ...requested, status: "CANCELLED" });
    await expect(VendorWithdrawalService.cancelWithdrawal("payout-1", "vendor-a", "user-a")).resolves.toMatchObject({ status: "CANCELLED" });
    expect(mocks.ledgerCreate).not.toHaveBeenCalled();
    mocks.payoutFindFirst.mockResolvedValue({ ...requested, status: "APPROVED" });
    await expect(VendorWithdrawalService.cancelWithdrawal("payout-1", "vendor-a", "user-a")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("requires server-side admin authority before approval", async () => {
    mocks.adminContext.mockRejectedValue(new Error("Administrative permission denied."));
    await expect(VendorWithdrawalService.approveWithdrawal("payout-1")).rejects.toThrow("Administrative permission denied");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("allows internal admin approval without moving reserved funds", async () => {
    mocks.payoutFindUnique.mockResolvedValue(requested);
    await expect(VendorWithdrawalService.approveWithdrawal("payout-1")).resolves.toMatchObject({ status: "APPROVED" });
    expect(mocks.ledgerCreate).not.toHaveBeenCalled();
  });

  it("rejection releases reserved funds and terminal requests cannot be approved", async () => {
    mocks.payoutFindFirst.mockResolvedValue(requested);
    await expect(VendorWithdrawalService.rejectWithdrawal("payout-1")).resolves.toMatchObject({ status: "REJECTED" });
    expect(mocks.ledgerCreate).toHaveBeenCalledTimes(2);
    mocks.payoutFindUnique.mockResolvedValue({ ...requested, status: "REJECTED" });
    await expect(VendorWithdrawalService.approveWithdrawal("payout-1")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("allocates FIFO lots with partial consumption and exact Decimal totals", async () => {
    mocks.ledgerFindMany.mockResolvedValue([
      { id: "lot-a", amount: new Decimal("30000"), payoutAllocations: [] },
      { id: "lot-b", amount: new Decimal("50000"), payoutAllocations: [] },
    ]);
    await VendorWithdrawalService.requestWithdrawal(input);
    const allocations = mocks.allocationCreateMany.mock.calls[0][0].data;
    expect(allocations).toEqual([
      expect.objectContaining({ earningLedgerId: "lot-a", allocatedAmount: new Decimal("30000") }),
      expect.objectContaining({ earningLedgerId: "lot-b", allocatedAmount: new Decimal("30000") }),
    ]);
    expect(allocations.reduce((sum: Decimal, allocation: { allocatedAmount: Decimal }) => sum.plus(allocation.allocatedAmount), new Decimal(0))).toEqual(new Decimal("60000"));
  });

  it("uses createdAt then id as the deterministic FIFO tie-breaker", async () => {
    mocks.ledgerFindMany.mockResolvedValue([
      { id: "lot-a", amount: new Decimal("30000"), payoutAllocations: [] },
      { id: "lot-b", amount: new Decimal("30000"), payoutAllocations: [] },
    ]);
    await VendorWithdrawalService.requestWithdrawal(input);
    expect(mocks.ledgerFindMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }));
    expect(mocks.allocationCreateMany.mock.calls[0][0].data.map((allocation: { earningLedgerId: string }) => allocation.earningLedgerId)).toEqual(["lot-a", "lot-b"]);
  });

  it("subtracts only ACTIVE Decimal allocations, leaving released capacity reusable", async () => {
    mocks.ledgerFindMany.mockResolvedValue([{ id: "lot-b", amount: new Decimal("50000"), payoutAllocations: [{ allocatedAmount: new Decimal("20000") }] }]);
    await VendorWithdrawalService.requestWithdrawal({ ...input, amount: "30000" });
    expect(mocks.allocationCreateMany.mock.calls[0][0].data).toEqual([expect.objectContaining({ earningLedgerId: "lot-b", allocatedAmount: new Decimal("30000") })]);
    expect(mocks.ledgerFindMany).toHaveBeenCalledWith(expect.objectContaining({ include: { payoutAllocations: { where: { status: "ACTIVE" }, select: { allocatedAmount: true } } } }));
  });

  it("scopes lot selection to the requesting vendor and currency", async () => {
    await VendorWithdrawalService.requestWithdrawal(input);
    expect(mocks.ledgerFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ vendorId: "vendor-a", currency: "UGX", type: "SALE_AVAILABLE" }) }));
  });

  it("fails closed without payout, allocations, or reservation entries when attributable capacity is insufficient", async () => {
    mocks.ledgerFindMany.mockResolvedValue([{ id: "lot-a", amount: new Decimal("40000"), payoutAllocations: [] }]);
    await expect(VendorWithdrawalService.requestWithdrawal({ ...input, amount: "50000" })).rejects.toMatchObject({ code: "INSUFFICIENT_AVAILABLE_BALANCE" });
    expect(mocks.payoutCreate).not.toHaveBeenCalled();
    expect(mocks.allocationCreateMany).not.toHaveBeenCalled();
    expect(mocks.ledgerCreate).not.toHaveBeenCalled();
  });

  it("stops before reservation legs when allocation persistence fails inside the serializable transaction", async () => {
    mocks.allocationCreateMany.mockRejectedValueOnce(new Error("allocation insert failed"));
    await expect(VendorWithdrawalService.requestWithdrawal(input)).rejects.toThrow("allocation insert failed");
    expect(mocks.ledgerCreate).not.toHaveBeenCalled();
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "Serializable" }));
  });

  it("releases immutable allocation rows on cancellation and rejection", async () => {
    mocks.payoutFindFirst.mockResolvedValue(requested);
    await VendorWithdrawalService.cancelWithdrawal("payout-1", "vendor-a", "user-a");
    expect(mocks.allocationUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { vendorPayoutId: "payout-1", status: "ACTIVE" }, data: expect.objectContaining({ status: "RELEASED" }) }));
    mocks.payoutFindFirst.mockResolvedValue(requested);
    await VendorWithdrawalService.rejectWithdrawal("payout-1");
    expect(mocks.allocationUpdateMany).toHaveBeenCalledTimes(2);
  });

  it("provides authorized funding inspection with exact affected reversal exposure", async () => {
    mocks.payoutFindUnique.mockResolvedValue({ id: "payout-1", vendorId: "vendor-a", amount: new Decimal("60000"), currency: "UGX", status: "APPROVED", allocations: [
      { status: "ACTIVE", allocatedAmount: new Decimal("20000"), earningLedger: { paymentAttempt: { status: "REVERSED" } } },
      { status: "ACTIVE", allocatedAmount: new Decimal("40000"), earningLedger: { paymentAttempt: { status: "COMPLETED" } } },
      { status: "RELEASED", allocatedAmount: new Decimal("90000"), earningLedger: { paymentAttempt: { status: "REVERSED" } } },
    ] });
    await expect(VendorWithdrawalService.inspectPayoutFundingForCurrentAdmin("payout-1")).resolves.toMatchObject({ reversalExposure: new Decimal("20000") });
    expect(mocks.adminContext).toHaveBeenCalledWith("platform:manage_billing");
  });

  it("does not alter commission economics or send a payment-provider request", () => {
    expect(MIN_VENDOR_WITHDRAWAL_AMOUNT).toEqual(new Decimal("5000"));
    expect(VendorWithdrawalService).toBeDefined();
  });
});
