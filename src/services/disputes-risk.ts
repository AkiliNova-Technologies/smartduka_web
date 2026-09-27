import { DisputeStatus, Prisma, RiskFlagScope, RiskFlagStatus, RiskSeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { requireAdminContext } from "@/lib/auth/admin-context";
import { ReturnsRefundsService } from "@/services/returns-refunds";

export const DISPUTE_WINDOW_DAYS = 30;
const ACTIVE_DISPUTE_STATUSES: DisputeStatus[] = [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW];
export class DisputeRiskError extends Error {}
const withinWindow = (confirmedAt: Date, now: Date) => now.getTime() <= confirmedAt.getTime() + DISPUTE_WINDOW_DAYS * 86400000;

export class DisputeRiskService {
  static async openForCurrentCustomer(input: { subOrderId: string; reason: string; description: string }, now = new Date()) {
    return this.open({ ...input, customerId: await getCurrentUserId() }, now);
  }
  static async open(input: { subOrderId: string; customerId: string; reason: string; description: string }, now = new Date()) {
    const reason = input.reason.trim(); const description = input.description.trim();
    if (!reason || !description) throw new DisputeRiskError("A dispute reason and description are required.");
    return prisma.$transaction(async (tx) => {
      const sub = await tx.subOrder.findUnique({ where: { id: input.subOrderId }, include: { order: true, disputes: { where: { status: { in: ACTIVE_DISPUTE_STATUSES } } } } });
      if (!sub || sub.order.customerId !== input.customerId || sub.status !== "DELIVERED" || !sub.deliveryConfirmedAt || !withinWindow(sub.deliveryConfirmedAt, now)) throw new DisputeRiskError("Dispute is not eligible.");
      if (sub.disputes[0]) return sub.disputes[0];
      const dispute = await tx.dispute.create({ data: { customerId: input.customerId, orderId: sub.orderId, subOrderId: sub.id, vendorId: sub.vendorId, reason, description } });
      await tx.auditLog.create({ data: { userId: input.customerId, vendorId: sub.vendorId, action: "DISPUTE_OPENED", entity: "Dispute", entityId: dispute.id, newValues: { subOrderId: sub.id, reason } } });
      return dispute;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  static async listForCurrentCustomer() { const customerId = await getCurrentUserId(); return prisma.dispute.findMany({ where: { customerId }, select: { id: true, subOrderId: true, reason: true, status: true, openedAt: true, resolvedAt: true }, orderBy: { createdAt: "desc" } }); }
  static async getForCurrentCustomer(id: string) { const customerId = await getCurrentUserId(); return prisma.dispute.findFirst({ where: { id, customerId }, select: { id: true, subOrderId: true, reason: true, description: true, status: true, openedAt: true, resolvedAt: true, resolution: true } }); }
  static async listForCurrentVendor() { const vendor = await requireVendorContext("vendor:view_orders"); return prisma.dispute.findMany({ where: { vendorId: vendor.vendorId }, select: { id: true, subOrderId: true, reason: true, status: true, openedAt: true }, orderBy: { createdAt: "desc" } }); }
  static async getForCurrentVendor(id: string) { const vendor = await requireVendorContext("vendor:view_orders"); return prisma.dispute.findFirst({ where: { id, vendorId: vendor.vendorId }, select: { id: true, subOrderId: true, reason: true, description: true, status: true, openedAt: true, resolvedAt: true, resolution: true } }); }
  static async listForCurrentAdmin(status?: DisputeStatus) { await requireAdminContext("platform:customer_support"); return prisma.dispute.findMany({ where: status ? { status } : undefined, select: { id: true, customerId: true, vendorId: true, orderId: true, subOrderId: true, reason: true, status: true, openedAt: true }, orderBy: { createdAt: "asc" } }); }
  static async transitionForCurrentAdmin(id: string, status: DisputeStatus, resolution = "", refundItems?: Array<{ orderItemId: string; quantity: number }>) {
    const admin = await requireAdminContext("platform:customer_support");
    if (!([DisputeStatus.UNDER_REVIEW, DisputeStatus.RESOLVED_CUSTOMER, DisputeStatus.RESOLVED_VENDOR, DisputeStatus.REJECTED, DisputeStatus.CANCELLED] as DisputeStatus[]).includes(status)) throw new DisputeRiskError("Unsupported dispute transition.");
    const dispute = await prisma.dispute.findUnique({ where: { id }, include: { subOrder: true } });
    if (!dispute || !ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) throw new DisputeRiskError("Dispute cannot be transitioned.");
    if (status === DisputeStatus.RESOLVED_CUSTOMER) {
      if (!refundItems?.length) throw new DisputeRiskError("Customer resolution requires refund items.");
      await ReturnsRefundsService.createRefundReservation({ subOrderId: dispute.subOrderId, requestedByUserId: dispute.customerId, reason: `Dispute ${dispute.id}: ${resolution.trim() || "Customer resolution"}`, items: refundItems });
    }
    const resolved = !ACTIVE_DISPUTE_STATUSES.includes(status);
    const updated = await prisma.dispute.update({ where: { id }, data: { status, resolution: resolution.trim() || null, resolvedAt: resolved ? new Date() : null, resolvedByUserId: resolved ? admin.userId : null } });
    await prisma.auditLog.create({ data: { userId: admin.userId, vendorId: dispute.vendorId, action: "DISPUTE_STATUS_CHANGED", entity: "Dispute", entityId: id, newValues: { status } } });
    return updated;
  }
  static async createRiskFlagForCurrentAdmin(input: { scope: RiskFlagScope; category: "SUSPICIOUS_PAYMENT" | "ACCOUNT_TAKEOVER_SUSPECTED" | "UNUSUAL_ORDER_ACTIVITY" | "REFUND_ABUSE" | "VENDOR_FULFILLMENT_RISK" | "MANUAL_REVIEW"; severity: RiskSeverity; reason: string; customerId?: string; vendorId?: string; orderId?: string; subOrderId?: string; payoutId?: string }) {
    const admin = await requireAdminContext("platform:customer_support"); const reason = input.reason.trim();
    if (!reason || (input.scope === RiskFlagScope.VENDOR && !input.vendorId) || (input.scope === RiskFlagScope.SUBORDER && !input.subOrderId) || (input.scope === RiskFlagScope.ORDER && !input.orderId) || (input.scope === RiskFlagScope.PAYOUT && !input.payoutId)) throw new DisputeRiskError("Risk flag scope is incomplete.");
    const flag = await prisma.riskFlag.create({ data: { ...input, reason, source: "ADMIN", createdByUserId: admin.userId } });
    await prisma.auditLog.create({ data: { userId: admin.userId, vendorId: input.vendorId, action: "RISK_FLAG_CREATED", entity: "RiskFlag", entityId: flag.id, newValues: { scope: input.scope, severity: input.severity } } }); return flag;
  }
  static async listRiskFlagsForCurrentAdmin() { await requireAdminContext("platform:customer_support"); return prisma.riskFlag.findMany({ select: { id: true, scope: true, category: true, severity: true, status: true, vendorId: true, orderId: true, subOrderId: true, payoutId: true, createdAt: true }, orderBy: { createdAt: "desc" } }); }
  static async resolveRiskFlagForCurrentAdmin(id: string, status: "RESOLVED" | "DISMISSED", resolution: string) { const admin = await requireAdminContext("platform:customer_support"); if (!resolution.trim()) throw new DisputeRiskError("A risk flag resolution is required."); const flag = await prisma.riskFlag.findUnique({ where: { id } }); if (!flag || flag.status !== RiskFlagStatus.OPEN) throw new DisputeRiskError("Risk flag cannot be transitioned."); const updated = await prisma.riskFlag.update({ where: { id }, data: { status, resolution: resolution.trim(), resolvedAt: new Date(), resolvedByUserId: admin.userId } }); await prisma.auditLog.create({ data: { userId: admin.userId, vendorId: flag.vendorId, action: "RISK_FLAG_RESOLVED", entity: "RiskFlag", entityId: id, newValues: { status } } }); return updated; }
}
