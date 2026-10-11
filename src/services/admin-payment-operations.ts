import { PaymentIntentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { requireAdminContext } from "@/lib/auth/admin-context";
import { PaymentReconciliationService } from "@/services/payment-reconciliation";
import { paymentHealth, type PaymentHealth } from "@/services/payment-health";

export type PaymentQueueFilter = "ALL" | "PENDING" | "CONFIRMATION_DELAYED" | "STUCK" | "SUCCESSFUL" | "FAILED" | "REVERSED" | "NEEDS_REVIEW";

const mask = (value: string | null) => value ? `••••${value.slice(-6)}` : null;
const select = { id: true, orderId: true, subOrderId: true, vendorId: true, provider: true, amount: true, currency: true, status: true, providerReference: true, createdAt: true, updatedAt: true, lastReconciledAt: true, nextReconcileAt: true, reconcileAttempts: true, lastReconcileError: true, subOrder: { select: { subOrderNumber: true, status: true } }, vendor: { select: { storeName: true } }, order: { select: { orderNumber: true, paymentStatus: true } } } as const;
type Row = Prisma.PaymentIntentGetPayload<{ select: typeof select }>;

function health(row: Pick<Row, "status" | "createdAt" | "reconcileAttempts" | "lastReconcileError">): PaymentHealth | null {
  return paymentHealth(row);
}
function view(row: Row) {
  const paymentHealth = health(row);
  return { ...row, amount: row.amount.toFixed(2), providerReference: mask(row.providerReference), paymentHealth, needsReview: paymentHealth === "NEEDS_REVIEW", ageMinutes: Math.max(0, Math.floor((Date.now() - row.createdAt.getTime()) / 60_000)), safeErrorSummary: row.lastReconcileError?.slice(0, 300) ?? null };
}
function matches(row: ReturnType<typeof view>, filter: PaymentQueueFilter) {
  if (filter === "ALL") return true;
  if (["PENDING", "SUCCESSFUL", "FAILED", "REVERSED"].includes(filter)) return row.status === filter;
  return filter === "NEEDS_REVIEW" ? row.needsReview : row.paymentHealth === filter;
}
function whereFor(filter: PaymentQueueFilter, search?: string): Prisma.PaymentIntentWhereInput {
  const status: PaymentIntentStatus | Prisma.EnumPaymentIntentStatusFilter | undefined = filter === "PENDING" ? PaymentIntentStatus.PENDING : filter === "SUCCESSFUL" ? PaymentIntentStatus.SUCCESSFUL : filter === "FAILED" ? PaymentIntentStatus.FAILED : filter === "REVERSED" ? PaymentIntentStatus.REVERSED : filter === "CONFIRMATION_DELAYED" || filter === "STUCK" ? PaymentIntentStatus.PENDING : filter === "NEEDS_REVIEW" ? { in: [PaymentIntentStatus.PENDING, PaymentIntentStatus.REVERSED] } : undefined;
  const query = search?.trim();
  return { ...(status ? { status } : {}), ...(query ? { OR: [{ id: { contains: query } }, { providerReference: { contains: query } }, { order: { orderNumber: { contains: query } } }, { vendor: { storeName: { contains: query } } }] } : {}) };
}

export class AdminPaymentOperationsService {
  static async list(input: { filter?: PaymentQueueFilter; page?: number; pageSize?: number; search?: string } = {}) {
    await requireAdminContext("platform:manage_billing");
    const filter = input.filter ?? "ALL";
    const page = Math.max(1, Math.floor(input.page ?? 1));
    const pageSize = Math.min(100, Math.max(10, Math.floor(input.pageSize ?? 25)));
    const where = whereFor(filter, input.search);
    const [rows, total] = await Promise.all([prisma.paymentIntent.findMany({ where, select, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), prisma.paymentIntent.count({ where })]);
    // Delayed/stuck/review are derived operational conditions. The base query
    // remains server-side and bounded; no payment history is loaded at once.
    return { items: rows.map(view).filter((row) => matches(row, filter)), total, page, pageSize };
  }

  static async detail(id: string) {
    await requireAdminContext("platform:manage_billing");
    const row = await prisma.paymentIntent.findUnique({ where: { id }, select });
    if (!row) return null;
    const auditTrail = await prisma.auditLog.findMany({ where: { entity: "PaymentIntent", entityId: id }, select: { action: true, createdAt: true }, orderBy: { createdAt: "asc" } });
    const paymentHealth = health(row);
    return { ...view(row), timeline: await PaymentReconciliationService.timeline(id), auditTrail: auditTrail.map((entry) => ({ action: entry.action, timestamp: entry.createdAt })), operationalWarnings: [row.status === "REVERSED" ? `Payment reversed — review required. Seller fulfillment is ${row.subOrder.status}.` : null, paymentHealth === "STUCK" ? "Confirmation is stuck; use provider recheck." : null, paymentHealth === "CONFIRMATION_DELAYED" ? "Confirmation is delayed; provider recheck is available." : null, paymentHealth === "NEEDS_REVIEW" && row.status !== "REVERSED" ? "Payment needs operational review." : null].filter((warning): warning is string => Boolean(warning)) };
  }

  static async diagnostics() {
    await requireAdminContext("platform:manage_billing");
    const rows = await prisma.paymentIntent.findMany({ select: { status: true, createdAt: true, lastReconciledAt: true, reconcileAttempts: true, lastReconcileError: true } });
    const counts = { pending: 0, confirmationDelayed: 0, stuck: 0, successful: 0, failed: 0, reversed: 0, needsReview: 0 };
    for (const row of rows) { if (row.status === "PENDING") counts.pending++; if (row.status === "SUCCESSFUL") counts.successful++; if (row.status === "FAILED") counts.failed++; if (row.status === "REVERSED") counts.reversed++; const state = paymentHealth(row); if (state === "CONFIRMATION_DELAYED") counts.confirmationDelayed++; if (state === "STUCK") counts.stuck++; if (state === "NEEDS_REVIEW") counts.needsReview++; }
    const pending = rows.filter((row) => row.status === "PENDING");
    const oldest = pending.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    const lastSuccessfulProviderLookup = rows.filter((row) => row.lastReconciledAt).sort((a, b) => b.lastReconciledAt!.getTime() - a.lastReconciledAt!.getTime())[0]?.lastReconciledAt ?? null;
    return { ...counts, oldestPendingAgeMinutes: oldest ? Math.floor((Date.now() - oldest.createdAt.getTime()) / 60_000) : null, recentProviderErrorCount: rows.filter((row) => Boolean(row.lastReconcileError)).length, lastSuccessfulOAuth: null, lastSuccessfulProviderLookup };
  }
}
