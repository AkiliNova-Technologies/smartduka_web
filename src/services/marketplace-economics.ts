import {
  LedgerTransactionType,
  PaymentAttemptStatus,
  PaymentStatus,
  WalletBucket,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma/client";
import { VendorContext } from "@/lib/vendor/vendor-context";
const ZERO = new Decimal(0);
function isAllocationDuplicate(error: unknown) {
  if (
    !(
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    )
  )
    return false;
  const target =
    "meta" in error &&
    typeof error.meta === "object" &&
    error.meta &&
    "target" in error.meta
      ? error.meta.target
      : undefined;
  return Array.isArray(target)
    ? target.includes("subOrderId") &&
        target.includes("paymentAttemptId") &&
        target.includes("type")
    : typeof target === "string" &&
        target.includes("FinancialLedger_subOrderId_paymentAttemptId_type_key");
}
export class MarketplaceEconomicsError extends Error {}

export function isSubOrderEligibleForEarningsRelease(subOrder: {
  status: string;
  order: { paymentStatus: string };
}) {
  return subOrder.status === "DELIVERED" && subOrder.order.paymentStatus === PaymentStatus.COMPLETED;
}

export class MarketplaceEconomicsService {
  static async allocatePaidOrderEconomics(
    orderId: string,
    paymentAttemptId: string,
  ) {
    const attempt = await prisma.paymentAttempt.findUnique({
      where: { id: paymentAttemptId },
      select: { id: true, orderId: true, status: true, orderCompletedAt: true },
    });
    if (
      !attempt ||
      attempt.orderId !== orderId ||
      attempt.status !== PaymentAttemptStatus.COMPLETED ||
      !attempt.orderCompletedAt
    )
      return { allocated: false };
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { subOrders: { include: { items: true } } },
    });
    if (!order || order.paymentStatus !== PaymentStatus.COMPLETED)
      return { allocated: false };
    const gross = order.subOrders.reduce(
      (sum, sub) =>
        sum.plus(sub.items.reduce((s, item) => s.plus(item.totalPrice), ZERO)),
      ZERO,
    );
    if (!gross.equals(order.subTotal))
      throw new MarketplaceEconomicsError(
        "Order merchandise reconciliation failed.",
      );
    await prisma.$transaction(async (tx) => {
      for (const sub of order.subOrders) {
        if (!sub.commissionRate || !sub.vendorNetEntitlement)
          throw new MarketplaceEconomicsError(
            "SubOrder economics snapshot is missing.",
          );
        const vendorGross = sub.items.reduce(
          (sum, item) => sum.plus(item.totalPrice),
          ZERO,
        );
        const expectedNet = vendorGross
          .minus(sub.platformCommission)
          .minus(sub.paymentProcessingFee);
        if (
          !vendorGross.equals(sub.vendorSubTotal) ||
          !expectedNet.equals(sub.vendorNetEntitlement)
        )
          throw new MarketplaceEconomicsError(
            "SubOrder economics reconciliation failed.",
          );
        try {
          await tx.financialLedger.create({
            data: {
              vendorId: sub.vendorId,
              orderId: order.id,
              subOrderId: sub.id,
              paymentAttemptId: attempt.id,
              type: LedgerTransactionType.SALE_PENDING,
              walletBucket: WalletBucket.PENDING,
              amount: sub.vendorNetEntitlement,
              currency: order.currency,
              reference: sub.subOrderNumber,
              description: "Verified paid order vendor entitlement.",
            },
          });
        } catch (error: unknown) {
          if (!isAllocationDuplicate(error)) throw error;
          const existing = await tx.financialLedger.findFirst({
            where: {
              subOrderId: sub.id,
              paymentAttemptId: attempt.id,
              type: LedgerTransactionType.SALE_PENDING,
            },
            select: { id: true },
          });
          if (!existing) throw error;
        }
      }
    });
    return { allocated: true };
  }
  static async releaseVendorEarningsForSubOrder(subOrderId: string) {
    const subOrder = await prisma.subOrder.findUnique({
      where: { id: subOrderId },
      select: {
        id: true,
        vendorId: true,
        orderId: true,
        status: true,
        vendorNetEntitlement: true,
        order: { select: { paymentStatus: true } },
      },
    });
    if (!subOrder || !isSubOrderEligibleForEarningsRelease(subOrder)) return { released: false };
    if (!subOrder.vendorNetEntitlement) throw new MarketplaceEconomicsError("SubOrder economics snapshot is missing.");

    const pending = await prisma.financialLedger.findFirst({
      where: { subOrderId: subOrder.id, type: LedgerTransactionType.SALE_PENDING },
      select: { id: true, vendorId: true, orderId: true, paymentAttemptId: true, amount: true, currency: true },
    });
    if (!pending || !pending.paymentAttemptId || !pending.currency) return { released: false, missingPendingAllocation: true };
    if (pending.vendorId !== subOrder.vendorId || pending.orderId !== subOrder.orderId || !pending.amount.equals(subOrder.vendorNetEntitlement))
      throw new MarketplaceEconomicsError("Pending allocation reconciliation failed.");

    const releaseData = {
      vendorId: pending.vendorId,
      orderId: subOrder.orderId,
      subOrderId: subOrder.id,
      paymentAttemptId: pending.paymentAttemptId,
      currency: pending.currency,
      reference: pending.id,
    };
    try {
      await prisma.$transaction(async (tx) => {
        await tx.financialLedger.create({
          data: { ...releaseData, type: LedgerTransactionType.SALE_RELEASE, walletBucket: WalletBucket.PENDING, amount: pending.amount.negated(), description: "Released pending vendor entitlement." },
        });
        await tx.financialLedger.create({
          data: { ...releaseData, type: LedgerTransactionType.SALE_AVAILABLE, walletBucket: WalletBucket.AVAILABLE, amount: pending.amount, description: "Available vendor entitlement." },
        });
      });
    } catch (error: unknown) {
      if (!isAllocationDuplicate(error)) throw error;
      // PostgreSQL aborts a transaction after a constraint violation, so confirm the
      // race winner only after this transaction has rolled back.
      const [pendingDebit, availableCredit] = await Promise.all([
        prisma.financialLedger.findFirst({ where: { subOrderId: subOrder.id, paymentAttemptId: pending.paymentAttemptId, type: LedgerTransactionType.SALE_RELEASE }, select: { id: true } }),
        prisma.financialLedger.findFirst({ where: { subOrderId: subOrder.id, paymentAttemptId: pending.paymentAttemptId, type: LedgerTransactionType.SALE_AVAILABLE }, select: { id: true } }),
      ]);
      if (!pendingDebit || !availableCredit) throw error;
    }
    return { released: true };
  }

  static async vendorBalancesForCurrentVendor(currency: string) {
    const vendorId = VendorContext.getVendorId();
    if (!vendorId)
      throw new MarketplaceEconomicsError("Vendor context is required.");
    return this.vendorBalances(vendorId, currency);
  }
  static async vendorBalances(vendorId: string, currency: string) {
    const entries = await prisma.financialLedger.findMany({
      where: { vendorId, currency },
      select: { amount: true, walletBucket: true, type: true },
    });
    const total = (bucket: WalletBucket) =>
      entries
        .filter((e) => e.walletBucket === bucket)
        .reduce((sum, e) => sum.plus(e.amount), ZERO);
    return {
      currency,
      pendingBalance: total(WalletBucket.PENDING),
      availableBalance: total(WalletBucket.AVAILABLE),
      reservedBalance: total(WalletBucket.RESERVED),
      paidOutTotal: total(WalletBucket.PAID_OUT),
    };
  }
}
