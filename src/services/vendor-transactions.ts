import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { PAYMENT_HEALTH_THRESHOLDS, paymentHealth, type PaymentHealth } from "@/services/payment-health";

export const vendorTransactionFilters = ["ALL", "PENDING", "SUCCESSFUL", "FAILED", "REVERSED", "NEEDS_REVIEW"] as const;
export type VendorTransactionFilter = (typeof vendorTransactionFilters)[number];

const select = {
  id: true, provider: true, amount: true, currency: true, status: true,
  providerReference: true, createdAt: true, updatedAt: true,
  lastReconciledAt: true, nextReconcileAt: true, reconcileAttempts: true,
  lastReconcileError: true,
  order: { select: { orderNumber: true } },
  subOrder: { select: { id: true, subOrderNumber: true, status: true } },
} as const;
type TransactionRecord = Prisma.PaymentIntentGetPayload<{ select: typeof select }>;

const maskReference = (value: string | null) => value ? `••••${value.slice(-4)}` : null;
const healthFor = (row: Pick<TransactionRecord, "status" | "createdAt" | "reconcileAttempts" | "lastReconcileError">): PaymentHealth | null => paymentHealth(row);

function toRow(row: TransactionRecord) {
  const health = healthFor(row);
  return {
    id: row.id,
    orderNumber: row.order.orderNumber,
    subOrderId: row.subOrder.id,
    subOrderNumber: row.subOrder.subOrderNumber,
    amount: row.amount.toFixed(2),
    currency: row.currency,
    provider: row.provider,
    status: row.status,
    paymentHealth: health,
    needsReview: health === "NEEDS_REVIEW",
    maskedProviderReference: maskReference(row.providerReference),
    reconciliationAttempts: row.reconcileAttempts,
    lastReconciliationAt: row.lastReconciledAt,
    nextReconcileAt: row.nextReconcileAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    fulfillmentStatus: row.subOrder.status,
  };
}
export type VendorTransactionRow = ReturnType<typeof toRow>;

function matches(row: VendorTransactionRow, filter: VendorTransactionFilter) {
  if (filter === "ALL") return true;
  if (filter === "NEEDS_REVIEW") return row.needsReview;
  return row.status === filter;
}

function whereFor(vendorId: string, filter: VendorTransactionFilter, search?: string): Prisma.PaymentIntentWhereInput {
  const query = search?.trim();
  const filterWhere: Prisma.PaymentIntentWhereInput = filter === "NEEDS_REVIEW" ? { OR: [
    { status: "REVERSED" },
    { status: "PENDING", reconcileAttempts: { gte: PAYMENT_HEALTH_THRESHOLDS.reviewAttempts } },
  ] } : filter === "ALL" ? {} : { status: filter };
  const searchWhere: Prisma.PaymentIntentWhereInput = query ? { OR: [
    { id: { contains: query } },
    { providerReference: { contains: query } },
    { order: { orderNumber: { contains: query } } },
    { subOrder: { subOrderNumber: { contains: query } } },
  ] } : {};
  return {
    vendorId,
    AND: [filterWhere, searchWhere],
  };
}

/** A seller-scoped, read-only projection of direct payment intents. */
export class VendorTransactionsService {
  static async list(vendorId: string, input: { filter?: VendorTransactionFilter; page?: number; pageSize?: number; search?: string } = {}) {
    const filter = input.filter ?? "ALL";
    const page = Math.max(1, Math.floor(input.page ?? 1));
    const pageSize = Math.min(100, Math.max(10, Math.floor(input.pageSize ?? 25)));
    const where = whereFor(vendorId, filter, input.search);
    // NEEDS_REVIEW maps exactly to a terminal reversal or the established
    // reconciliation-attempt threshold, so filtering and pagination remain in SQL.
    const [records, total, allRecords] = await Promise.all([
      prisma.paymentIntent.findMany({ where, select, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.paymentIntent.count({ where }),
      prisma.paymentIntent.findMany({ where: { vendorId }, select: { status: true, createdAt: true, reconcileAttempts: true, lastReconcileError: true } }),
    ]);
    // Health is derived from the canonical intent, never persisted as a second ledger.
    const rows = records.map(toRow).filter((row) => matches(row, filter));
    const counts = { successful: 0, pending: 0, reversed: 0, needsReview: 0 };
    for (const record of allRecords) {
      if (record.status === "SUCCESSFUL") counts.successful++;
      if (record.status === "PENDING") counts.pending++;
      if (record.status === "REVERSED") counts.reversed++;
      if (paymentHealth(record) === "NEEDS_REVIEW") counts.needsReview++;
    }
    return { rows, counts, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  static async detail(vendorId: string, id: string) {
    const record = await prisma.paymentIntent.findFirst({ where: { id, vendorId }, select });
    return record ? toRow(record) : null;
  }
}
