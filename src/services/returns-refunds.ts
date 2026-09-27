import { LedgerTransactionType, PaymentStatus, Prisma, RefundStatus, SubOrderStatus, WalletBucket } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma/client";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { requireAdminContext } from "@/lib/auth/admin-context";

export const RETURN_WINDOW_DAYS = 14;
export const SHIPPING_REFUND_POLICY = "NON_REFUNDABLE" as const;
const ZERO = new Decimal(0);
export class ReturnsRefundsError extends Error {}
export function calculatePartialRefundEconomics(input: { originalGross: Decimal; originalCommission: Decimal; originalVendorNet: Decimal; previouslyRefundedGross: Decimal; previouslyReversedCommission: Decimal; previouslyReversedVendorNet: Decimal; requestedGross: Decimal }) {
  const gross = refundableProportion(input.originalGross, input.previouslyRefundedGross, input.requestedGross);
  const final = gross.equals(input.originalGross.minus(input.previouslyRefundedGross));
  const commission = final ? input.originalCommission.minus(input.previouslyReversedCommission) : input.originalCommission.times(gross).dividedBy(input.originalGross).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const vendorNet = final ? input.originalVendorNet.minus(input.previouslyReversedVendorNet) : gross.minus(commission);
  if (!commission.plus(vendorNet).equals(gross)) throw new ReturnsRefundsError("Historical refund economics do not reconcile.");
  return { gross, commission, vendorNet };
}

export function refundableProportion(total: Decimal, refunded: Decimal, requested: Decimal) {
  if (requested.lessThanOrEqualTo(ZERO) || refunded.plus(requested).greaterThan(total)) throw new ReturnsRefundsError("Refund exceeds historical refundable merchandise.");
  return requested.equals(total.minus(refunded)) ? total.minus(refunded) : requested;
}

export class ReturnsRefundsService {
  static async cancelSubOrderForCurrentCustomer(subOrderId: string) { return this.cancelSubOrder(subOrderId, { userId: await getCurrentUserId() }); }
  static async cancelSubOrderForCurrentVendor(subOrderId: string) { const vendor = await requireVendorContext("vendor:process_orders"); return this.cancelSubOrder(subOrderId, { userId: vendor.user.id, vendorId: vendor.vendorId }); }
  static async cancelSubOrderForCurrentAdmin(subOrderId: string) { const admin = await requireAdminContext("platform:manage_billing"); return this.cancelSubOrder(subOrderId, { userId: admin.userId, admin: true }); }
  static async requestReturnForCurrentCustomer(input: Omit<Parameters<typeof ReturnsRefundsService.requestReturn>[0], "userId">) { return this.requestReturn({ ...input, userId: await getCurrentUserId() }); }

  static async listReturnsForCurrentCustomer() { const userId = await getCurrentUserId(); return prisma.returnRequest.findMany({ where: { requestedByUserId: userId }, select: { id: true, status: true, reason: true, createdAt: true, subOrderId: true }, orderBy: { createdAt: "desc" } }); }
  static async listReturnsForCurrentVendor() { const vendor = await requireVendorContext("vendor:process_orders"); return prisma.returnRequest.findMany({ where: { subOrder: { vendorId: vendor.vendorId } }, select: { id: true, status: true, reason: true, createdAt: true, subOrderId: true }, orderBy: { createdAt: "desc" } }); }
  static async listRefundsForCurrentCustomer() { const userId = await getCurrentUserId(); return prisma.refund.findMany({ where: { requestedByUserId: userId }, select: { id: true, subOrderId: true, amount: true, currency: true, status: true, reason: true, createdAt: true }, orderBy: { createdAt: "desc" } }); }
  static async listRefundsForCurrentVendor() { const vendor = await requireVendorContext("vendor:process_orders"); return prisma.refund.findMany({ where: { subOrder: { vendorId: vendor.vendorId } }, select: { id: true, subOrderId: true, amount: true, currency: true, status: true, reason: true, createdAt: true }, orderBy: { createdAt: "desc" } }); }

  static async getVendorReturnById(id: string) { const vendor = await requireVendorContext("vendor:process_orders"); return prisma.returnRequest.findFirst({ where: { id, subOrder: { vendorId: vendor.vendorId } }, select: { id: true, status: true, reason: true, createdAt: true, subOrderId: true, items: { select: { orderItemId: true, quantity: true } } } }); }
  static async getVendorRefundById(id: string) { const vendor = await requireVendorContext("vendor:process_orders"); return prisma.refund.findFirst({ where: { id, subOrder: { vendorId: vendor.vendorId } }, select: { id: true, status: true, amount: true, vendorLiabilityAdjustment: true, currency: true, createdAt: true, subOrderId: true, items: { select: { orderItemId: true, quantity: true, grossAmount: true } } } }); }
  static async listReturnsForCurrentAdmin() { await requireAdminContext("platform:manage_billing"); return prisma.returnRequest.findMany({ where: { status: { in: ["REQUESTED", "APPROVED", "RECEIVED"] } }, select: { id:true,status:true,subOrderId:true,createdAt:true,reason:true }, orderBy:{createdAt:"asc"} }); }
  static async listRefundsForCurrentAdmin() { await requireAdminContext("platform:manage_billing"); return prisma.refund.findMany({ where: { status: { in: ["REQUESTED", "APPROVED", "READY_FOR_PROVIDER_REFUND"] } }, select: { id:true,status:true,subOrderId:true,amount:true,currency:true,createdAt:true }, orderBy:{createdAt:"asc"} }); }

  static async cancelSubOrder(subOrderId: string, actor: { userId: string; vendorId?: string; admin?: boolean }) {
    return prisma.$transaction(async (tx) => {
      const sub = await tx.subOrder.findUnique({ where: { id: subOrderId }, include: { order: true, items: true } });
      if (!sub || (!actor.admin && (actor.vendorId ? sub.vendorId !== actor.vendorId : sub.order.customerId !== actor.userId))) throw new ReturnsRefundsError("SubOrder was not found.");
      if (sub.status === SubOrderStatus.CANCELLED) return sub;
      if (sub.status !== SubOrderStatus.PENDING) throw new ReturnsRefundsError("Cancellation is allowed only before fulfillment begins.");
      for (const item of sub.items) {
        if (item.variantId) await tx.productVariant.update({ where: { id: item.variantId }, data: { inventoryCount: { increment: item.quantity } } });
        else await tx.product.update({ where: { id: item.productId }, data: { inventoryCount: { increment: item.quantity } } });
      }
      const updated = await tx.subOrder.update({ where: { id: sub.id }, data: { status: SubOrderStatus.CANCELLED } });
      if (sub.order.paymentStatus === PaymentStatus.COMPLETED) {
        const attempt = await tx.paymentAttempt.findFirst({ where: { orderId: sub.orderId, status: "COMPLETED" }, select: { id: true } });
        await tx.refund.create({ data: { orderId: sub.orderId, subOrderId: sub.id, paymentAttemptId: attempt?.id, requestedByUserId: actor.userId, amount: sub.vendorSubTotal, currency: sub.order.currency, reason: "Cancellation", status: RefundStatus.REQUESTED } });
      }
      return updated;
    });
  }

  static async requestReturn(input: { subOrderId: string; userId: string; reason: string; items: Array<{ orderItemId: string; quantity: number }> }, now = new Date()) {
    return prisma.$transaction(async (tx) => {
      const sub = await tx.subOrder.findUnique({ where: { id: input.subOrderId }, include: { order: true, items: true, returnRequests: { where: { status: { in: ["REQUESTED", "APPROVED", "RECEIVED", "COMPLETED"] } }, include: { items: true } } } });
      if (!sub || sub.order.customerId !== input.userId || sub.status !== SubOrderStatus.DELIVERED || !sub.deliveryConfirmedAt || now.getTime() > sub.deliveryConfirmedAt.getTime() + RETURN_WINDOW_DAYS * 86400000) throw new ReturnsRefundsError("Return is not eligible.");
      const requested = new Map(input.items.map((item) => [item.orderItemId, item.quantity]));
      if (!requested.size || [...requested.values()].some((q) => !Number.isSafeInteger(q) || q <= 0)) throw new ReturnsRefundsError("Return quantities are invalid.");
      for (const item of sub.items) { const qty = requested.get(item.id); const prior = sub.returnRequests.reduce((sum, request) => sum + (request.items.find((returnItem) => returnItem.orderItemId === item.id)?.quantity ?? 0), 0); if (qty && qty + prior > item.quantity) throw new ReturnsRefundsError("Return quantity exceeds purchased quantity."); }
      if ([...requested.keys()].some((id) => !sub.items.some((item) => item.id === id))) throw new ReturnsRefundsError("Return item is not part of this SubOrder.");
      return tx.returnRequest.create({ data: { subOrderId: sub.id, requestedByUserId: input.userId, reason: input.reason.trim(), items: { create: [...requested].map(([orderItemId, quantity]) => ({ orderItemId, quantity })) } } });
    });
  }

  static async createRefundReservation(input: { subOrderId: string; requestedByUserId: string; items: Array<{ orderItemId: string; quantity: number }>; reason: string }) {
    for (let attempt = 0; attempt < 3; attempt += 1) try {
    return await prisma.$transaction(async (tx) => {
      const sub = await tx.subOrder.findUnique({ where: { id: input.subOrderId }, include: { order: true, items: true } });
      if (!sub || sub.order.customerId !== input.requestedByUserId) throw new ReturnsRefundsError("SubOrder was not found.");
      const requested = new Map(input.items.map((item) => [item.orderItemId, item.quantity]));
      if (!requested.size || [...requested.values()].some((quantity) => !Number.isSafeInteger(quantity) || quantity <= 0)) throw new ReturnsRefundsError("Refund quantities are invalid.");
      if ([...requested.keys()].some((id) => !sub.items.some((item) => item.id === id))) throw new ReturnsRefundsError("Refund item is not part of this SubOrder.");
      const existing = await tx.refund.findMany({ where: { subOrderId: sub.id, status: { in: [RefundStatus.REQUESTED, RefundStatus.APPROVED, RefundStatus.READY_FOR_PROVIDER_REFUND, RefundStatus.COMPLETED] } }, include: { items: true } });
      for (const item of sub.items) { const qty = requested.get(item.id); const used = existing.reduce((sum, refund) => sum + (refund.items.find((entry) => entry.orderItemId === item.id)?.quantity ?? 0), 0); if (qty && used + qty > item.quantity) throw new ReturnsRefundsError("Refund quantity exceeds remaining refundable quantity."); }
      const gross = sub.items.reduce((sum, item) => sum.plus(item.totalPrice.dividedBy(item.quantity).times(requested.get(item.id) ?? 0)), ZERO);
      const priorGross = existing.reduce((sum, refund) => sum.plus(refund.amount), ZERO); const priorCommission = existing.reduce((sum, refund) => sum.plus(refund.platformCommissionAdjustment), ZERO); const priorVendor = existing.reduce((sum, refund) => sum.plus(refund.vendorLiabilityAdjustment), ZERO);
      const originalGross = sub.items.reduce((sum, item) => sum.plus(item.totalPrice), ZERO);
      const economics = calculatePartialRefundEconomics({ originalGross, originalCommission: sub.platformCommission, originalVendorNet: sub.vendorNetEntitlement ?? originalGross.minus(sub.platformCommission), previouslyRefundedGross: priorGross, previouslyReversedCommission: priorCommission, previouslyReversedVendorNet: priorVendor, requestedGross: gross });
      const attempt = await tx.paymentAttempt.findFirst({ where: { orderId: sub.orderId, status: "COMPLETED" }, select: { id: true } });
      return tx.refund.create({ data: { orderId: sub.orderId, subOrderId: sub.id, paymentAttemptId: attempt?.id, requestedByUserId: input.requestedByUserId, amount: economics.gross, platformCommissionAdjustment: economics.commission, vendorLiabilityAdjustment: economics.vendorNet, shippingAmount: ZERO, gatewayFeeAdjustment: ZERO, currency: sub.order.currency, reason: input.reason.trim(), status: RefundStatus.REQUESTED, items: { create: [...requested].map(([orderItemId, quantity]) => ({ orderItemId, quantity, grossAmount: sub.items.find((item) => item.id === orderItemId)!.totalPrice.dividedBy(sub.items.find((item) => item.id === orderItemId)!.quantity).times(quantity) })) } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2034") || attempt === 2) throw error;
    }
    throw new ReturnsRefundsError("Refund reservation could not be completed.");
  }

  static async approveRefund(refundId: string) {
    const admin = await requireAdminContext("platform:manage_billing");
    return prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({ where: { id: refundId } });
      if (!refund) throw new ReturnsRefundsError("Refund was not found.");
      if (refund.status === RefundStatus.APPROVED) return refund;
      if (refund.status !== RefundStatus.REQUESTED) throw new ReturnsRefundsError("Refund cannot be approved from its current state.");
      return tx.refund.update({ where: { id: refund.id }, data: { status: RefundStatus.APPROVED, approvedByUserId: admin.userId, approvedAt: new Date() } });
    });
  }

  static async rejectRefund(refundId: string, reason: string) {
    const admin = await requireAdminContext("platform:manage_billing");
    const cleanReason = reason.trim();
    if (!cleanReason) throw new ReturnsRefundsError("A rejection reason is required.");
    return prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({ where: { id: refundId } });
      if (!refund) throw new ReturnsRefundsError("Refund was not found.");
      if (refund.status === RefundStatus.REJECTED) return refund;
      if (refund.status !== RefundStatus.REQUESTED) throw new ReturnsRefundsError("Refund cannot be rejected from its current state.");
      return tx.refund.update({ where: { id: refund.id }, data: { status: RefundStatus.REJECTED, reason: `${refund.reason}\nRejection: ${cleanReason}`, approvedByUserId: admin.userId } });
    });
  }

  static async approveReturn(returnId: string) {
    await requireAdminContext("platform:manage_billing");
    const request = await prisma.returnRequest.findUnique({ where: { id: returnId } });
    if (!request) throw new ReturnsRefundsError("Return was not found.");
    if (request.status === "APPROVED") return request;
    if (request.status !== "REQUESTED") throw new ReturnsRefundsError("Return cannot be approved from its current state.");
    return prisma.returnRequest.update({ where: { id: request.id }, data: { status: "APPROVED" } });
  }

  static async markReturnReceived(returnId: string) {
    const vendor = await requireVendorContext("vendor:process_orders");
    return prisma.$transaction(async (tx) => {
      const request = await tx.returnRequest.findFirst({ where: { id: returnId, subOrder: { vendorId: vendor.vendorId } }, include: { items: true } });
      if (!request) throw new ReturnsRefundsError("Return was not found.");
      if (request.status === "RECEIVED" || request.status === "COMPLETED") return request;
      if (request.status !== "APPROVED") throw new ReturnsRefundsError("Return cannot be received from its current state.");
      for (const item of request.items) {
        const existing = await tx.returnItem.findUnique({ where: { returnRequestId_orderItemId: { returnRequestId: request.id, orderItemId: item.orderItemId } }, include: { orderItem: true } });
        if (!existing || existing.restockedAt) continue;
        if (existing.orderItem.variantId) await tx.productVariant.update({ where: { id: existing.orderItem.variantId }, data: { inventoryCount: { increment: existing.quantity } } });
        else await tx.product.update({ where: { id: existing.orderItem.productId }, data: { inventoryCount: { increment: existing.quantity } } });
        await tx.returnItem.update({ where: { id: existing.id }, data: { restockedAt: new Date() } });
      }
      return tx.returnRequest.update({ where: { id: request.id }, data: { status: "RECEIVED", receivedAt: new Date() } });
    });
  }

  static async reversePaymentEarnings(paymentAttemptId: string) {
    const originals = await prisma.financialLedger.findMany({ where: { paymentAttemptId, type: { in: [LedgerTransactionType.SALE_PENDING, LedgerTransactionType.SALE_AVAILABLE] } }, select: { vendorId: true, orderId: true, subOrderId: true, paymentAttemptId: true, amount: true, currency: true, type: true, reference: true } });
    await prisma.$transaction(async (tx) => { for (const entry of originals) { const type = entry.type === LedgerTransactionType.SALE_PENDING ? LedgerTransactionType.SALE_REVERSAL_PENDING : LedgerTransactionType.SALE_REVERSAL_AVAILABLE; const existing = await tx.financialLedger.findFirst({ where: { paymentAttemptId: entry.paymentAttemptId, subOrderId: entry.subOrderId, type }, select: { id: true } }); if (!existing) await tx.financialLedger.create({ data: { vendorId: entry.vendorId, orderId: entry.orderId, subOrderId: entry.subOrderId, paymentAttemptId: entry.paymentAttemptId, currency: entry.currency, reference: entry.reference, amount: entry.amount.negated(), walletBucket: entry.type === LedgerTransactionType.SALE_PENDING ? WalletBucket.PENDING : WalletBucket.AVAILABLE, type, description: "Append-only payment reversal adjustment." } }); } });
    return { reversed: originals.length > 0 };
  }
}
