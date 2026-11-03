import { ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { requireVendorContext } from "@/lib/auth/vendor-context";

const actionable = ["PENDING", "PROCESSING", "READY_FOR_PICKUP"] as const;
const completedSaleStatuses = ["DELIVERED", "REFUNDED"] as const;
const sellableProductStatuses = [ProductStatus.ACTIVE, ProductStatus.PUBLISHED] as const;
const lowStockThreshold = 5;
const KAMPALA_OFFSET_MS = 3 * 60 * 60 * 1000;

export type AnalyticsPeriod = "TODAY" | "7D" | "30D" | "90D";
type LowStockItem = { productId: string; variantId: string | null; productName: string; variantName: string | null; sku: string | null; stock: number; available: boolean };
type Sale = { subOrderId: string; confirmedAt: Date | null; amount: unknown; subOrder: { items: Array<{ quantity: number; productId: string; productNameSnapshot: string | null; product: { images: Array<{ url: string }> } }> } };
type CompletedRefund = { subOrderId: string; completedAt: Date | null; amount: unknown };

export function analyticsWindows(period: AnalyticsPeriod, now = new Date()) {
  const kampala = new Date(now.getTime() + KAMPALA_OFFSET_MS);
  const todayStartMs = Date.UTC(kampala.getUTCFullYear(), kampala.getUTCMonth(), kampala.getUTCDate()) - KAMPALA_OFFSET_MS;
  const days = period === "TODAY" ? 1 : period === "7D" ? 7 : period === "90D" ? 90 : 30;
  const currentStart = new Date(todayStartMs - (days - 1) * 86_400_000);
  const previousStart = new Date(currentStart.getTime() - days * 86_400_000);
  return { currentStart, previousStart, currentEnd: now, days };
}

export function summarizeAnalytics(sales: Sale[], refunds: CompletedRefund[], from: Date, to: Date) {
  // A suborder is the vendor accounting unit. Keep the earliest authoritative
  // confirmation if legacy/provider retries left multiple successful intents.
  const confirmed = new Map<string, Sale>();
  for (const sale of sales) {
    if (!sale.confirmedAt || sale.confirmedAt < from || sale.confirmedAt >= to) continue;
    const existing = confirmed.get(sale.subOrderId);
    if (!existing?.confirmedAt || sale.confirmedAt < existing.confirmedAt) confirmed.set(sale.subOrderId, sale);
  }
  const grossRevenue = [...confirmed.values()].reduce((sum, sale) => sum + Number(sale.amount), 0);
  const refundedRevenue = refunds.reduce((sum, refund) => refund.completedAt && refund.completedAt >= from && refund.completedAt < to ? sum + Number(refund.amount) : sum, 0);
  const unitsSold = [...confirmed.values()].reduce((sum, sale) => sum + sale.subOrder.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const revenue = grossRevenue - refundedRevenue;
  return { revenue, grossRevenue, refundedRevenue, orders: confirmed.size, unitsSold, averageOrderValue: confirmed.size ? revenue / confirmed.size : 0, confirmed };
}

async function inventory(context: { vendorId: string }) {
  const profile = await prisma.vendorProfile.findUniqueOrThrow({ where: { id: context.vendorId }, select: { branchInventoryEnabled: true } });
  const products = await prisma.product.findMany({
    where: { vendorId: context.vendorId, deletedAt: null, status: { in: [...sellableProductStatuses] } },
    select: { id: true, name: true, sku: true, inventoryCount: true, variants: { where: { isActive: true }, select: { id: true, name: true, sku: true, inventoryCount: true } } },
  });
  const branchRows = profile.branchInventoryEnabled ? await prisma.branchInventory.findMany({
    where: { shopId: context.vendorId, branch: { isActive: true } },
    select: { productId: true, variantId: true, onHandQuantity: true, reservedQuantity: true },
  }) : [];
  const availableByIdentity = new Map<string, number>();
  for (const row of branchRows) {
    const key = `${row.productId}:${row.variantId ?? ""}`;
    availableByIdentity.set(key, (availableByIdentity.get(key) ?? 0) + Math.max(0, row.onHandQuantity - row.reservedQuantity));
  }
  const items: LowStockItem[] = products.flatMap<LowStockItem>((product) => {
    const identities = product.variants.length
      ? product.variants.map((variant) => ({ variantId: variant.id as string | null, variantName: variant.name as string | null, sku: variant.sku as string | null, canonical: variant.inventoryCount }))
      : [{ variantId: null, variantName: null, sku: product.sku, canonical: product.inventoryCount }];
    return identities.map((identity) => {
      const stock = profile.branchInventoryEnabled ? availableByIdentity.get(`${product.id}:${identity.variantId ?? ""}`) ?? 0 : identity.canonical;
      return { productId: product.id, variantId: identity.variantId, productName: product.name, variantName: identity.variantName, sku: identity.sku, stock, available: stock > 0 };
    });
  });
  const lowStockItems = items.filter((item) => item.stock > 0 && item.stock <= lowStockThreshold);
  return { lowStockItems, lowStockCount: lowStockItems.length, outOfStockCount: items.filter((item) => item.stock <= 0).length };
}

const saleSelect = {
  subOrderId: true, confirmedAt: true, amount: true,
  subOrder: { select: { items: { select: {
    quantity: true, productId: true, productNameSnapshot: true,
    product: { select: { images: { take: 1, orderBy: { sortOrder: "asc" as const }, select: { url: true } } } },
  } } } },
} as const;

export class VendorMobileInsightsService {
  static async dashboard() {
    // The response includes revenue, so order-only roles must not receive it.
    const context = await requireVendorContext("vendor:view_ledger");
    const { currentStart, currentEnd } = analyticsWindows("TODAY");
    const [sales, refunds, openOrders, recentOrders, stock] = await Promise.all([
      prisma.paymentIntent.findMany({ where: { vendorId: context.vendorId, purpose: "MARKETPLACE_PURCHASE", status: "SUCCESSFUL", confirmedAt: { gte: currentStart, lt: currentEnd }, subOrder: { status: { in: [...completedSaleStatuses] } } }, select: saleSelect }),
      prisma.refund.findMany({ where: { subOrder: { vendorId: context.vendorId }, status: "COMPLETED", completedAt: { gte: currentStart, lt: currentEnd } }, select: { subOrderId: true, completedAt: true, amount: true } }),
      prisma.subOrder.count({ where: { vendorId: context.vendorId, status: { in: [...actionable] } } }),
      prisma.subOrder.findMany({ where: { vendorId: context.vendorId }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, subOrderNumber: true, status: true, vendorTotal: true, createdAt: true, order: { select: { paymentStatus: true, customer: { select: { name: true } } } }, items: { select: { id: true } } } }),
      inventory(context),
    ]);
    const today = summarizeAnalytics(sales, refunds, currentStart, currentEnd);
    return {
      summary: { todayRevenue: today.revenue, todayOrders: today.orders, openOrders, lowStockCount: stock.lowStockCount, outOfStockCount: stock.outOfStockCount },
      recentOrders: recentOrders.map((order) => ({ id: order.id, orderNumber: order.subOrderNumber, status: order.status, total: Number(order.vendorTotal), paymentStatus: order.order.paymentStatus, customerName: order.order.customer.name, itemCount: order.items.length, createdAt: order.createdAt })),
      lowStockItems: stock.lowStockItems.slice(0, 10),
    };
  }

  static async analytics(period: AnalyticsPeriod) {
    const context = await requireVendorContext("vendor:view_ledger");
    const { currentStart, previousStart, currentEnd } = analyticsWindows(period);
    const [sales, refunds, pendingOrders, cancelledOrders, stock] = await Promise.all([
      prisma.paymentIntent.findMany({ where: { vendorId: context.vendorId, purpose: "MARKETPLACE_PURCHASE", status: "SUCCESSFUL", confirmedAt: { gte: previousStart, lt: currentEnd }, subOrder: { status: { in: [...completedSaleStatuses] } } }, select: saleSelect, orderBy: { confirmedAt: "asc" } }),
      prisma.refund.findMany({ where: { subOrder: { vendorId: context.vendorId }, status: "COMPLETED", completedAt: { gte: previousStart, lt: currentEnd } }, select: { subOrderId: true, completedAt: true, amount: true } }),
      prisma.subOrder.count({ where: { vendorId: context.vendorId, status: { in: [...actionable] }, createdAt: { gte: currentStart, lt: currentEnd } } }),
      prisma.subOrder.count({ where: { vendorId: context.vendorId, status: "CANCELLED", createdAt: { gte: currentStart, lt: currentEnd } } }),
      inventory(context),
    ]);
    const current = summarizeAnalytics(sales, refunds, currentStart, currentEnd);
    const previous = summarizeAnalytics(sales, refunds, previousStart, currentStart);
    const byProduct = new Map<string, { productId: string; name: string; unitsSold: number; thumbnail: string | null }>();
    for (const sale of current.confirmed.values()) for (const item of sale.subOrder.items) {
      const product = byProduct.get(item.productId) ?? { productId: item.productId, name: item.productNameSnapshot ?? "Product", unitsSold: 0, thumbnail: item.product.images[0]?.url ?? null };
      product.unitsSold += item.quantity;
      byProduct.set(item.productId, product);
    }
    const refundedOrders = new Set(refunds.filter((refund) => refund.completedAt && refund.completedAt >= currentStart && refund.completedAt < currentEnd).map((refund) => refund.subOrderId)).size;
    const stripInternal = (summary: ReturnType<typeof summarizeAnalytics>) => ({
      revenue: summary.revenue, grossRevenue: summary.grossRevenue,
      refundedRevenue: summary.refundedRevenue, orders: summary.orders,
      unitsSold: summary.unitsSold, averageOrderValue: summary.averageOrderValue,
    });
    return {
      period, ...stripInternal(current), completedOrders: current.orders, pendingOrders,
      previous: stripInternal(previous), cancelledOrders, refundedOrders,
      lowStockCount: stock.lowStockCount, outOfStockCount: stock.outOfStockCount,
      revenueBasis: "cash_basis_confirmed_vendor_payments_less_refunds_completed_in_period",
      topProducts: [...byProduct.values()].sort((a, b) => b.unitsSold - a.unitsSold || a.name.localeCompare(b.name)).slice(0, 5),
    };
  }
}
