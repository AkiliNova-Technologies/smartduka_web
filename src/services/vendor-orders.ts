import { Prisma, SubOrderStatus } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { cacheProfiles, cacheTags } from "@/lib/cache-policy";
import { SUB_ORDER_ALLOWED_TRANSITIONS } from "@/services/order";

export type VendorOrdersQuery = { page?: number; pageSize?: number; search?: string; status?: string };
export type VendorOrdersResult = {
  orders: Array<{ id: string; subOrderNumber: string; status: string; allowedActions: { status: string; label: string }[]; vendorTotal: number; customerName: string; customerPhone: string; deliveryAddress: string; notes: string | null; paymentStatus: string; createdAt: string; items: { name: string; quantity: number; price: number; total: number }[]; issues: { returns: string[]; refunds: string[]; disputes: string[] } }>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  statusCounts: Record<string, number>;
};

const actionsByStatus: Record<string, { status: string; label: string }[]> = {
  PENDING: [{ status: "PROCESSING", label: "Start processing" }],
  PROCESSING: [{ status: "READY_FOR_PICKUP", label: "Mark ready for pickup" }, { status: "SHIPPED", label: "Mark shipped" }],
  READY_FOR_PICKUP: [{ status: "SHIPPED", label: "Mark shipped" }],
  SHIPPED: [{ status: "DELIVERED", label: "Mark delivered" }],
};

/** Call only after resolving and authorizing the vendor on the server. */
export async function getVendorOrders(vendorId: string, query: VendorOrdersQuery = {}): Promise<VendorOrdersResult> {
  "use cache";
  cacheLife(cacheProfiles.vendorOperational);
  cacheTag(cacheTags.vendorOrders(vendorId));

  const pageSize = [10, 20, 50].includes(query.pageSize ?? 10) ? query.pageSize! : 10;
  const selectedStatus = query.status && Object.values(SubOrderStatus).includes(query.status as SubOrderStatus) ? query.status as SubOrderStatus : undefined;
  const search = query.search?.trim() || "";
  const where: Prisma.SubOrderWhereInput = { vendorId, ...(selectedStatus ? { status: selectedStatus } : {}), ...(search ? { OR: [{ subOrderNumber: { contains: search, mode: "insensitive" } }, { order: { customer: { name: { contains: search, mode: "insensitive" } } } }] } : {}) };
  const [total, statusRows] = await Promise.all([
    prisma.subOrder.count({ where }),
    prisma.subOrder.groupBy({ by: ["status"], where: { vendorId }, _count: { _all: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(Number.isInteger(query.page) ? query.page! : 1, 1), totalPages);
  const subOrders = await prisma.subOrder.findMany({
    where,
    include: { order: { select: { shippingAddress: true, shippingPhone: true, notes: true, paymentStatus: true, customer: { select: { name: true } } } }, items: { include: { product: { select: { name: true } } } }, returnRequests: { select: { status: true } }, refunds: { select: { status: true } }, disputes: { select: { status: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize,
  });
  return {
    orders: subOrders.map((subOrder) => ({ id: subOrder.id, subOrderNumber: subOrder.subOrderNumber, status: subOrder.status, allowedActions: (SUB_ORDER_ALLOWED_TRANSITIONS[subOrder.status] || []).filter((status) => status !== "CANCELLED").map((status) => actionsByStatus[subOrder.status]?.find((action) => action.status === status)).filter((action): action is { status: string; label: string } => Boolean(action)), vendorTotal: Number(subOrder.vendorTotal), customerName: subOrder.order.customer.name || "Customer", customerPhone: subOrder.order.shippingPhone, deliveryAddress: subOrder.order.shippingAddress, notes: subOrder.order.notes, paymentStatus: subOrder.order.paymentStatus, createdAt: subOrder.createdAt.toISOString(), items: subOrder.items.map((item) => ({ name: item.productNameSnapshot ?? item.product.name, quantity: item.quantity, price: Number(item.priceAtPurchase), total: Number(item.totalPrice) })), issues: { returns: subOrder.returnRequests.map((item) => item.status), refunds: subOrder.refunds.map((item) => item.status), disputes: subOrder.disputes.map((item) => item.status) } })),
    pagination: { page, pageSize, total, totalPages }, statusCounts: Object.fromEntries(statusRows.map((row) => [row.status, row._count._all])),
  };
}
