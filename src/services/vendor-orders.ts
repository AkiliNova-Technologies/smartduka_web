import { Prisma, SubOrderStatus } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { cacheProfiles, cacheTags } from "@/lib/cache-policy";
import { canFulfillSubOrder } from "@/services/payment-fulfillment";

export type VendorOrdersQuery = { page?: number; pageSize?: number; search?: string; status?: string };
export type VendorOrdersResult = {
  orders: Array<{ id: string; subOrderNumber: string; status: string; fulfillmentStatus: string; allowedActions: { status: string; label: string }[]; vendorTotal: number; customerName: string; customerPhone: string; fulfillmentMethod: "DELIVERY" | "PICKUP"; fulfillmentFee: number; branchName: string | null; deliveryAddress: string | null; pickupLocation: string | null; pickupDirections: string | null; pickupInstructions: string | null; notes: string | null; paymentStatus: string; createdAt: string; items: { name: string; quantity: number; price: number; total: number }[]; issues: { returns: string[]; refunds: string[]; disputes: string[] } }>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  statusCounts: Record<string, number>;
};

const fulfillmentActions = (method: "DELIVERY" | "PICKUP", status: string) => {
  if (method === "PICKUP") {
    if (status === "PENDING") return [{ status: "PROCESSING", label: "Start processing" }];
    if (status === "PROCESSING") return [{ status: "READY_FOR_PICKUP", label: "Mark ready for pickup" }];
    if (status === "READY_FOR_PICKUP") return [{ status: "DELIVERED", label: "Mark collected" }];
    return [];
  }
  if (status === "PENDING") return [{ status: "PROCESSING", label: "Start processing" }];
  if (status === "PROCESSING") return [{ status: "SHIPPED", label: "Mark shipped" }];
  if (status === "SHIPPED") return [{ status: "DELIVERED", label: "Mark delivered" }];
  return [];
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
    include: { order: { select: { shippingAddress: true, shippingPhone: true, notes: true, paymentStatus: true, paymentGateway: true, customer: { select: { name: true } } } }, paymentIntents: { select: { status: true } }, items: { include: { product: { select: { name: true } } } }, returnRequests: { select: { status: true } }, refunds: { select: { status: true } }, disputes: { select: { status: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize,
  });
  return {
    orders: subOrders.map((subOrder) => {
      const paymentConfirmed = canFulfillSubOrder({
        paymentGateway: subOrder.order.paymentGateway,
        paymentIntentStatuses: subOrder.paymentIntents.map((intent) => intent.status),
      });
      // Payment state in a vendor workspace is seller-scoped. A parent order
      // may be in an exception state because another seller was reversed;
      // that must not make this vendor's confirmed payment look reversed.
      const localPaymentStatus = subOrder.paymentIntents.some((intent) => intent.status === "REVERSED")
        ? "REVERSED"
        : subOrder.paymentIntents.some((intent) => intent.status === "SUCCESSFUL")
          ? "COMPLETED"
          : subOrder.order.paymentStatus;
      const snapshot = subOrder.fulfillmentSnapshot && typeof subOrder.fulfillmentSnapshot === "object" && !Array.isArray(subOrder.fulfillmentSnapshot) ? subOrder.fulfillmentSnapshot as Record<string, unknown> : {};
      return { id: subOrder.id, subOrderNumber: subOrder.subOrderNumber, status: subOrder.status, fulfillmentStatus: subOrder.fulfillmentStatus, allowedActions: paymentConfirmed ? fulfillmentActions(subOrder.fulfillmentMethod, subOrder.status) : [], vendorTotal: Number(subOrder.vendorTotal), customerName: subOrder.order.customer.name || "Customer", customerPhone: typeof snapshot.deliveryContact === "string" ? snapshot.deliveryContact : typeof snapshot.pickupContact === "string" ? snapshot.pickupContact : subOrder.order.shippingPhone, fulfillmentMethod: subOrder.fulfillmentMethod, fulfillmentFee: typeof snapshot.deliveryFee === "string" ? Number(snapshot.deliveryFee) : 0, branchName: typeof snapshot.branchName === "string" ? snapshot.branchName : null, deliveryAddress: subOrder.fulfillmentMethod === "DELIVERY" ? (typeof snapshot.deliveryAddress === "string" ? snapshot.deliveryAddress : subOrder.order.shippingAddress) : null, pickupLocation: typeof snapshot.branchAddress === "string" ? snapshot.branchAddress : typeof snapshot.pickupLocation === "string" ? snapshot.pickupLocation : null, pickupDirections: typeof snapshot.pickupDirections === "string" ? snapshot.pickupDirections : null, pickupInstructions: typeof snapshot.pickupInstructions === "string" ? snapshot.pickupInstructions : null, notes: subOrder.order.notes, paymentStatus: localPaymentStatus, createdAt: subOrder.createdAt.toISOString(), items: subOrder.items.map((item) => ({ name: item.productNameSnapshot ?? item.product.name, quantity: item.quantity, price: Number(item.priceAtPurchase), total: Number(item.totalPrice) })), issues: { returns: subOrder.returnRequests.map((item) => item.status), refunds: subOrder.refunds.map((item) => item.status), disputes: subOrder.disputes.map((item) => item.status) } };
    }),
    pagination: { page, pageSize, total, totalPages }, statusCounts: Object.fromEntries(statusRows.map((row) => [row.status, row._count._all])),
  };
}
