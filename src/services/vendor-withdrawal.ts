import { createHash } from "node:crypto";
import { LedgerTransactionType, PayoutDestinationType, PayoutStatus, Prisma, WalletBucket } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma/client";
import { requireAdminContext } from "@/lib/auth/admin-context";

const ZERO = new Decimal(0);
export const MIN_VENDOR_WITHDRAWAL_AMOUNT = new Decimal("5000");

export class WithdrawalError extends Error {
  constructor(message: string, public readonly code: "INVALID_REQUEST" | "INSUFFICIENT_AVAILABLE_BALANCE" | "IDEMPOTENCY_CONFLICT" | "DESTINATION_UNAVAILABLE" | "INVALID_TRANSITION") {
    super(message);
  }
}

type WithdrawalIntent = {
  vendorId: string;
  userId: string;
  amount: unknown;
  currency: string;
  destinationId: string;
  withdrawalRequestId: string;
};

function amountFrom(value: unknown) {
  try {
    const amount = new Decimal(String(value));
    if (!amount.isFinite() || amount.lessThan(MIN_VENDOR_WITHDRAWAL_AMOUNT)) throw new Error();
    return amount;
  } catch {
    throw new WithdrawalError(`Withdrawal amount must be at least ${MIN_VENDOR_WITHDRAWAL_AMOUNT.toString()}.`, "INVALID_REQUEST");
  }
}

function requestHash(input: Pick<WithdrawalIntent, "amount" | "currency" | "destinationId">, amount: Decimal) {
  return createHash("sha256").update(JSON.stringify({ amount: amount.toFixed(2), currency: input.currency, destinationId: input.destinationId })).digest("hex");
}

function validRequestId(value: string) {
  return /^[A-Za-z0-9_-]{16,128}$/.test(value);
}

function destinationSnapshot(vendor: { momoMerchantCode: string | null; bankName: string | null; bankAccountName: string | null; bankAccountNumber: string | null }, destinationId: string) {
  if (destinationId === PayoutDestinationType.MOBILE_MONEY) {
    if (!vendor.momoMerchantCode) throw new WithdrawalError("Mobile money destination is unavailable.", "DESTINATION_UNAVAILABLE");
    return { destinationType: PayoutDestinationType.MOBILE_MONEY, maskedDestination: `Mobile money •••• ${vendor.momoMerchantCode.slice(-4)}` };
  }
  if (destinationId === PayoutDestinationType.BANK_ACCOUNT) {
    if (!vendor.bankName || !vendor.bankAccountName || !vendor.bankAccountNumber) throw new WithdrawalError("Bank destination is unavailable.", "DESTINATION_UNAVAILABLE");
    return { destinationType: PayoutDestinationType.BANK_ACCOUNT, maskedDestination: `${vendor.bankName} •••• ${vendor.bankAccountNumber.slice(-4)}` };
  }
  throw new WithdrawalError("Unsupported withdrawal destination.", "INVALID_REQUEST");
}

function sameIntent<T extends { requestHash: string | null }>(payout: T, hash: string): T {
  if (payout.requestHash !== hash) throw new WithdrawalError("Withdrawal request ID was already used for different details.", "IDEMPOTENCY_CONFLICT");
  return payout;
}

function isKnown(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export class VendorWithdrawalService {
  static async requestWithdrawal(input: WithdrawalIntent) {
    const currency = input.currency.trim().toUpperCase();
    if (currency !== "UGX" || !validRequestId(input.withdrawalRequestId))
      throw new WithdrawalError("A valid UGX withdrawal request ID is required.", "INVALID_REQUEST");
    const amount = amountFrom(input.amount);
    const hash = requestHash({ amount: input.amount, currency, destinationId: input.destinationId }, amount);
    const existing = await prisma.vendorPayout.findUnique({ where: { vendorId_withdrawalRequestId: { vendorId: input.vendorId, withdrawalRequestId: input.withdrawalRequestId } } });
    if (existing) return sameIntent(existing, hash);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.$transaction(async (tx) => {
          const replay = await tx.vendorPayout.findUnique({ where: { vendorId_withdrawalRequestId: { vendorId: input.vendorId, withdrawalRequestId: input.withdrawalRequestId } } });
          if (replay) return sameIntent(replay, hash);
          const vendor = await tx.vendorProfile.findUnique({
            where: { id: input.vendorId },
            select: { momoMerchantCode: true, bankName: true, bankAccountName: true, bankAccountNumber: true },
          });
          if (!vendor) throw new WithdrawalError("Vendor destination is unavailable.", "DESTINATION_UNAVAILABLE");
          const destination = destinationSnapshot(vendor, input.destinationId);
          const lots = await tx.financialLedger.findMany({ where: { vendorId: input.vendorId, currency, type: LedgerTransactionType.SALE_AVAILABLE, amount: { gt: ZERO } }, include: { payoutAllocations: { where: { status: "ACTIVE" }, select: { allocatedAmount: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
          let remaining = amount;
          const allocations: Array<{ earningLedgerId: string; allocatedAmount: Decimal }> = [];
          for (const lot of lots) {
            const capacity = lot.amount.minus(lot.payoutAllocations.reduce((sum, allocation) => sum.plus(allocation.allocatedAmount), ZERO));
            if (capacity.lessThanOrEqualTo(ZERO)) continue;
            const allocatedAmount = Decimal.min(capacity, remaining);
            allocations.push({ earningLedgerId: lot.id, allocatedAmount });
            remaining = remaining.minus(allocatedAmount);
            if (remaining.equals(ZERO)) break;
          }
          if (!remaining.equals(ZERO)) throw new WithdrawalError("Withdrawal amount exceeds allocatable earning capacity.", "INSUFFICIENT_AVAILABLE_BALANCE");
          const payout = await tx.vendorPayout.create({
            data: { vendorId: input.vendorId, amount, currency, withdrawalRequestId: input.withdrawalRequestId, requestHash: hash, ...destination, requestedByUserId: input.userId, status: PayoutStatus.REQUESTED },
          });
          await tx.vendorPayoutAllocation.createMany({ data: allocations.map((allocation) => ({ vendorPayoutId: payout.id, earningLedgerId: allocation.earningLedgerId, vendorId: input.vendorId, currency, allocatedAmount: allocation.allocatedAmount })) });
          await tx.financialLedger.create({ data: { vendorId: input.vendorId, vendorPayoutId: payout.id, type: LedgerTransactionType.PAYOUT_RESERVE, walletBucket: WalletBucket.AVAILABLE, amount: amount.negated(), currency, reference: payout.id, description: "Withdrawal reservation." } });
          await tx.financialLedger.create({ data: { vendorId: input.vendorId, vendorPayoutId: payout.id, type: LedgerTransactionType.PAYOUT_RESERVED, walletBucket: WalletBucket.RESERVED, amount, currency, reference: payout.id, description: "Reserved withdrawal funds." } });
          await tx.auditLog.create({ data: { vendorId: input.vendorId, userId: input.userId, action: "WITHDRAWAL_REQUESTED", entity: "VendorPayout", entityId: payout.id, newValues: { amount: amount.toString(), currency, destinationType: destination.destinationType } } });
          return payout;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (isKnown(error, "P2034") && attempt < 2) continue;
        if (isKnown(error, "P2002")) {
          const replay = await prisma.vendorPayout.findUnique({ where: { vendorId_withdrawalRequestId: { vendorId: input.vendorId, withdrawalRequestId: input.withdrawalRequestId } } });
          if (replay) return sameIntent(replay, hash);
        }
        throw error;
      }
    }
    throw new WithdrawalError("Withdrawal reservation could not be completed.", "INSUFFICIENT_AVAILABLE_BALANCE");
  }

  static async inspectPayoutFundingForCurrentAdmin(payoutId: string) {
    await requireAdminContext("platform:manage_billing");
    const payout = await prisma.vendorPayout.findUnique({
      where: { id: payoutId },
      select: {
        id: true, vendorId: true, amount: true, currency: true, status: true,
        allocations: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true, earningLedgerId: true, allocatedAmount: true, status: true, releasedAt: true, createdAt: true,
            earningLedger: { select: { createdAt: true, paymentAttempt: { select: { status: true } }, subOrder: { select: { subOrderNumber: true, order: { select: { orderNumber: true } }, disputes: { where: { status: { in: ["OPEN", "UNDER_REVIEW"] } }, select: { id: true } } } } } },
          },
        },
      },
    });
    if (!payout) throw new WithdrawalError("Withdrawal request was not found.", "INVALID_REQUEST");
    const reversalExposure = payout.allocations
      .filter((allocation) => allocation.status === "ACTIVE" && allocation.earningLedger.paymentAttempt?.status === "REVERSED")
      .reduce((total, allocation) => total.plus(allocation.allocatedAmount), ZERO);
    const disputeExposure = payout.allocations
      .filter((allocation) => allocation.status === "ACTIVE" && allocation.earningLedger.subOrder?.disputes?.length)
      .reduce((total, allocation) => total.plus(allocation.allocatedAmount), ZERO);
    return { ...payout, reversalExposure, disputeExposure };
  }

  static async listWithdrawals(vendorId: string) {
    return prisma.vendorPayout.findMany({
      where: { vendorId },
      select: { id: true, amount: true, currency: true, status: true, maskedDestination: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  static async cancelWithdrawal(payoutId: string, vendorId: string, userId: string) {
    return this.releaseWithdrawal(payoutId, PayoutStatus.CANCELLED, { vendorId, userId });
  }

  static async rejectWithdrawal(payoutId: string) {
    const admin = await requireAdminContext("platform:manage_billing");
    return this.releaseWithdrawal(payoutId, PayoutStatus.REJECTED, { userId: admin.userId });
  }

  static async approveWithdrawal(payoutId: string) {
    const admin = await requireAdminContext("platform:manage_billing");
    return this.approveWithdrawalAsAdmin(payoutId, admin.userId);
  }

  private static async approveWithdrawalAsAdmin(payoutId: string, adminUserId: string) {
    return prisma.$transaction(async (tx) => {
      const payout = await tx.vendorPayout.findUnique({ where: { id: payoutId } });
      if (!payout) throw new WithdrawalError("Withdrawal request was not found.", "INVALID_REQUEST");
      if (payout.status === PayoutStatus.APPROVED) return payout;
      if (payout.status !== PayoutStatus.REQUESTED) throw new WithdrawalError("Withdrawal cannot be approved from its current state.", "INVALID_TRANSITION");
      const updated = await tx.vendorPayout.update({ where: { id: payout.id }, data: { status: PayoutStatus.APPROVED, approvedByUserId: adminUserId, approvedAt: new Date() } });
      await tx.auditLog.create({ data: { vendorId: payout.vendorId, userId: adminUserId, action: "WITHDRAWAL_APPROVED", entity: "VendorPayout", entityId: payout.id } });
      return updated;
    });
  }

  static async approveWithdrawalForCurrentAdmin(payoutId: string) {
    return this.approveWithdrawal(payoutId);
  }

  static async rejectWithdrawalForCurrentAdmin(payoutId: string) {
    return this.rejectWithdrawal(payoutId);
  }

  private static async releaseWithdrawal(payoutId: string, target: "CANCELLED" | "REJECTED", actor: { vendorId?: string; userId: string }) {
    return prisma.$transaction(async (tx) => {
      const payout = await tx.vendorPayout.findFirst({ where: { id: payoutId, ...(actor.vendorId ? { vendorId: actor.vendorId } : {}) } });
      if (!payout) throw new WithdrawalError("Withdrawal request was not found.", "INVALID_REQUEST");
      if (payout.status === target) return payout;
      if (payout.status !== PayoutStatus.REQUESTED) throw new WithdrawalError("Withdrawal cannot transition from its current state.", "INVALID_TRANSITION");
      if (!payout.currency) throw new WithdrawalError("Legacy payout currency is unavailable.", "INVALID_TRANSITION");
      const timestamp = new Date();
      const updated = await tx.vendorPayout.update({ where: { id: payout.id }, data: target === PayoutStatus.CANCELLED ? { status: target, cancelledByUserId: actor.userId, cancelledAt: timestamp } : { status: target, rejectedByUserId: actor.userId, rejectedAt: timestamp } });
      await tx.vendorPayoutAllocation.updateMany({ where: { vendorPayoutId: payout.id, status: "ACTIVE" }, data: { status: "RELEASED", releasedAt: timestamp } });
      await tx.financialLedger.create({ data: { vendorId: payout.vendorId, vendorPayoutId: payout.id, type: LedgerTransactionType.PAYOUT_RELEASE, walletBucket: WalletBucket.RESERVED, amount: payout.amount.negated(), currency: payout.currency, reference: payout.id, description: `${target === PayoutStatus.CANCELLED ? "Cancelled" : "Rejected"} withdrawal release.` } });
      await tx.financialLedger.create({ data: { vendorId: payout.vendorId, vendorPayoutId: payout.id, type: LedgerTransactionType.PAYOUT_AVAILABLE, walletBucket: WalletBucket.AVAILABLE, amount: payout.amount, currency: payout.currency, reference: payout.id, description: "Returned withdrawal funds." } });
      await tx.auditLog.create({ data: { vendorId: payout.vendorId, userId: actor.userId, action: `WITHDRAWAL_${target}`, entity: "VendorPayout", entityId: payout.id } });
      return updated;
    });
  }
}
