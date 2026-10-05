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
    const context = await requireVendorContext("vendor:view_orders");
    const orders = await prisma.subOrder.findMany({ where: { vendorId: context.vendorId, status: "DELIVERED", order: { paymentStatus: "COMPLETED" }, createdAt: { gte: rangeStart(period) } }, select: { vendorTotal: true, items: { select: { quantity: true, productId: true, productNameSnapshot: true } } } });
    const revenue = orders.reduce((sum, order) => sum + Number(order.vendorTotal), 0);
    const byProduct = new Map<string, { productId: string; name: string; unitsSold: number }>();
    for (const order of orders) for (const item of order.items) { const current = byProduct.get(item.productId) ?? { productId: item.productId, name: item.productNameSnapshot ?? "Product", unitsSold: 0 }; current.unitsSold += item.quantity; byProduct.set(item.productId, current); }
    return { period, revenue, orders: orders.length, unitsSold: [...byProduct.values()].reduce((sum, item) => sum + item.unitsSold, 0), averageOrderValue: orders.length ? revenue / orders.length : 0, topProducts: [...byProduct.values()].sort((a, b) => b.unitsSold - a.unitsSold || a.name.localeCompare(b.name)).slice(0, 5) };
  }
}
