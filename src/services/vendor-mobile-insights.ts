import { prisma } from "@/lib/prisma/client";
import { requireVendorContext } from "@/lib/auth/vendor-context";

const actionable = ["PENDING", "PROCESSING", "READY_FOR_PICKUP"] as const;
const lowStockThreshold = 5;
type LowStockItem = { productId: string; variantId: string | null; productName: string; variantName: string | null; sku: string | null; stock: number; available: boolean };
const startOfToday = () => { const date = new Date(); date.setHours(0, 0, 0, 0); return date; };
const rangeStart = (period: "TODAY" | "7D" | "30D") => { const date = startOfToday(); if (period !== "TODAY") date.setDate(date.getDate() - (period === "7D" ? 6 : 29)); return date; };

export class VendorMobileInsightsService {
  static async dashboard() {
    const context = await requireVendorContext("vendor:view_orders");
    const today = startOfToday();
    const [todayCompleted, openOrders, products, recentOrders] = await Promise.all([
      prisma.subOrder.findMany({ where: { vendorId: context.vendorId, status: "DELIVERED", order: { paymentStatus: "COMPLETED" }, createdAt: { gte: today } }, select: { vendorTotal: true } }),
      prisma.subOrder.count({ where: { vendorId: context.vendorId, status: { in: [...actionable] } } }),
      prisma.product.findMany({ where: { vendorId: context.vendorId, deletedAt: null }, select: { id: true, name: true, sku: true, inventoryCount: true, variants: { select: { id: true, name: true, sku: true, inventoryCount: true, isActive: true } } } }),
      prisma.subOrder.findMany({ where: { vendorId: context.vendorId }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, subOrderNumber: true, status: true, vendorTotal: true, createdAt: true, order: { select: { paymentStatus: true, customer: { select: { name: true } } } }, items: { select: { id: true } } } }),
    ]);
    const lowStockItems: LowStockItem[] = products.flatMap<LowStockItem>((product) => product.variants.length ? product.variants.filter((variant) => variant.inventoryCount <= lowStockThreshold).map((variant) => ({ productId: product.id, variantId: variant.id, productName: product.name, variantName: variant.name, sku: variant.sku, stock: variant.inventoryCount, available: variant.isActive && variant.inventoryCount > 0 })) : product.inventoryCount <= lowStockThreshold ? [{ productId: product.id, variantId: null, productName: product.name, variantName: null, sku: product.sku, stock: product.inventoryCount, available: product.inventoryCount > 0 }] : []);
    return { summary: { todayRevenue: todayCompleted.reduce((sum, order) => sum + Number(order.vendorTotal), 0), todayOrders: todayCompleted.length, openOrders, lowStockCount: lowStockItems.length }, recentOrders: recentOrders.map((order) => ({ id: order.id, orderNumber: order.subOrderNumber, status: order.status, total: Number(order.vendorTotal), paymentStatus: order.order.paymentStatus, customerName: order.order.customer.name, itemCount: order.items.length, createdAt: order.createdAt })), lowStockItems: lowStockItems.slice(0, 10) };
  }

  static async analytics(period: "TODAY" | "7D" | "30D") {
    const context = await requireVendorContext("vendor:view_ledger");
    const now = new Date();
    const kampala = new Date(now.getTime() + 3 * 3600000);
    const midnight = Date.UTC(kampala.getUTCFullYear(), kampala.getUTCMonth(), kampala.getUTCDate()) - 3 * 3600000;
    const days = period === "TODAY" ? 1 : period === "7D" ? 7 : 30;
    const currentStart = new Date(midnight - (days - 1) * 86400000);
    const previousStart = new Date(currentStart.getTime() - days * 86400000);
    const intents = await prisma.paymentIntent.findMany({
      where: { vendorId: context.vendorId, purpose: "MARKETPLACE_PURCHASE",
        status: "SUCCESSFUL", confirmedAt: { gte: previousStart, lte: now },
        subOrder: { status: "DELIVERED" } },
      select: { subOrderId: true, confirmedAt: true, amount: true,
        subOrder: { select: {
          items: { select: { quantity: true, productId: true, productNameSnapshot: true } },
          refunds: { where: { status: "COMPLETED" }, select: { amount: true } },
        } },
      },
    });
    const summarize = (from: Date, to: Date) => {
      const matches = intents.filter((i) => i.confirmedAt && i.confirmedAt >= from && i.confirmedAt < to);
      const orders = new Map(matches.map((i) => [i.subOrderId, i]));
      const gross = matches.reduce((sum, i) => sum + Number(i.amount), 0);
      const refunds = [...orders.values()].reduce((sum, i) => sum +
        i.subOrder.refunds.reduce((value, refund) => value + Number(refund.amount), 0), 0);
      const revenue = Math.max(0, gross - refunds);
      const unitsSold = [...orders.values()].reduce((sum, i) => sum +
        i.subOrder.items.reduce((value, item) => value + item.quantity, 0), 0);
      return { revenue, orders: orders.size, unitsSold,
        averageOrderValue: orders.size ? revenue / orders.size : 0 };
    };
    const current = summarize(currentStart, new Date(now.getTime() + 1));
    const previous = summarize(previousStart, currentStart);
    const byProduct = new Map<string, { productId: string; name: string; unitsSold: number }>();
    const seen = new Set<string>();
    for (const intent of intents) {
      if (!intent.confirmedAt || intent.confirmedAt < currentStart || seen.has(intent.subOrderId)) continue;
      seen.add(intent.subOrderId);
      for (const item of intent.subOrder.items) {
        const product = byProduct.get(item.productId) ??
          { productId: item.productId, name: item.productNameSnapshot ?? "Product", unitsSold: 0 };
        product.unitsSold += item.quantity;
        byProduct.set(item.productId, product);
      }
    }
    const [cancelledOrders, refundedOrders] = await Promise.all([
      prisma.subOrder.count({ where: { vendorId: context.vendorId, status: "CANCELLED", createdAt: { gte: currentStart } } }),
      prisma.subOrder.count({ where: { vendorId: context.vendorId, status: "REFUNDED", createdAt: { gte: currentStart } } }),
    ]);
    return { period, ...current, previous, cancelledOrders, refundedOrders,
      revenueBasis: "confirmed_vendor_payments_less_completed_refunds",
      topProducts: [...byProduct.values()].sort((a, b) => b.unitsSold - a.unitsSold || a.name.localeCompare(b.name)).slice(0, 5) };
  }
}
