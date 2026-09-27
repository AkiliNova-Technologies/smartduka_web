import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), findMany: vi.fn(), findExistingOrder: vi.fn(), updateProductStock: vi.fn(), updateVariantStock: vi.fn(), createOrder: vi.fn(), createSubOrder: vi.fn(), createMany: vi.fn(), notification: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({ prisma: {
  $transaction: mocks.transaction,
  product: { findMany: mocks.findMany, updateMany: mocks.updateProductStock },
  productVariant: { updateMany: mocks.updateVariantStock },
  order: { create: mocks.createOrder, findFirst: mocks.findExistingOrder },
  subOrder: { create: mocks.createSubOrder },
  orderItem: { createMany: mocks.createMany },
  notification: { create: mocks.notification },
} }));

import { calculateCheckoutTotals, CheckoutError, OrderService } from "@/services/order";

const product = (id: string, vendorId: string, basePrice: number, variants: unknown[] = []) => ({
  id, vendorId, basePrice, variants, vendor: { subscriptions: [{ plan: { commissionRate: 10 } }] },
});
const input = { userId: "customer-a", checkoutRequestId: "checkout-request-0001", items: [{ productId: "product-a", quantity: 2 }], shippingAddress: "Kampala", shippingPhone: "0700000000", paymentGateway: "CASH_ON_DELIVERY" as const };

describe("canonical commerce architecture", () => {
  beforeEach(() => {
    mocks.transaction.mockImplementation((callback) => callback({ product: { findMany: mocks.findMany, updateMany: mocks.updateProductStock }, productVariant: { updateMany: mocks.updateVariantStock }, order: { create: mocks.createOrder }, subOrder: { create: mocks.createSubOrder }, orderItem: { createMany: mocks.createMany }, notification: { create: mocks.notification } }));
    vi.clearAllMocks();
    mocks.findExistingOrder.mockResolvedValue(null);
    mocks.createOrder.mockResolvedValue({ id: "order-a", paymentStatus: "PENDING" });
    mocks.createSubOrder.mockResolvedValue({ id: "suborder-a" });
    mocks.createMany.mockResolvedValue({ count: 1 });
    mocks.notification.mockResolvedValue({});
    mocks.updateProductStock.mockResolvedValue({ count: 1 });
    mocks.updateVariantStock.mockResolvedValue({ count: 1 });
  });

  it("uses one transaction and derives product prices and vendor suborders from database products", async () => {
    mocks.findMany.mockResolvedValue([product("product-a", "vendor-db", 12000), product("product-b", "vendor-db-2", 5000)]);
    await OrderService.createOrder({ ...input, items: [{ productId: "product-a", quantity: 2 }, { productId: "product-b", quantity: 1 }] });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { in: ["ACTIVE", "PUBLISHED"] }, deletedAt: null }) }));
    const persistedOrder = mocks.createOrder.mock.calls[0][0].data;
    expect(Number(persistedOrder.subTotal)).toBe(29000);
    expect(Number(persistedOrder.totalShipping)).toBe(7000);
    expect(Number(persistedOrder.taxAmount)).toBe(0);
    expect(Number(persistedOrder.totalAmount)).toBe(36000);
    expect(persistedOrder.paymentStatus).toBe("PENDING");
    expect(persistedOrder.currency).toBe("UGX");
    expect(mocks.createSubOrder).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ vendorId: "vendor-db" }) }));
    expect(mocks.createSubOrder).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ vendorId: "vendor-db-2" }) }));

  });
  it("supports only a variant belonging to its product and uses its server price", async () => {
    mocks.findMany.mockResolvedValue([product("product-a", "vendor-db", 12000, [{ id: "variant-a", price: 9000 }])]);
    await OrderService.createOrder({ ...input, items: [{ productId: "product-a", variantId: "variant-a", quantity: 2 }] });
    const persistedLine = mocks.createMany.mock.calls[0][0].data[0];
    expect(persistedLine.variantId).toBe("variant-a");
    expect(Number(persistedLine.priceAtPurchase)).toBe(9000);
    expect(Number(persistedLine.totalPrice)).toBe(18000);
    await expect(OrderService.createOrder({ ...input, items: [{ productId: "product-a", variantId: "forged", quantity: 1 }] })).rejects.toMatchObject({ code: "VARIANT_UNAVAILABLE" });
  });

  it.each([0, -1, 1.5])("rejects invalid quantity %s before persistence", async (quantity) => {
    await expect(OrderService.createOrder({ ...input, items: [{ productId: "product-a", quantity }] })).rejects.toBeInstanceOf(CheckoutError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});


describe("atomic inventory decrements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation((callback) => callback({ product: { findMany: mocks.findMany, updateMany: mocks.updateProductStock }, productVariant: { updateMany: mocks.updateVariantStock }, order: { create: mocks.createOrder }, subOrder: { create: mocks.createSubOrder }, orderItem: { createMany: mocks.createMany }, notification: { create: mocks.notification } }));
    mocks.createOrder.mockResolvedValue({ id: "order-a", paymentStatus: "PENDING" });
    mocks.createSubOrder.mockResolvedValue({ id: "suborder-a" });
    mocks.createMany.mockResolvedValue({ count: 1 }); mocks.notification.mockResolvedValue({});
    mocks.updateProductStock.mockResolvedValue({ count: 1 }); mocks.updateVariantStock.mockResolvedValue({ count: 1 });
  });

  it("conditionally decrements combined duplicate product demand inside the order transaction", async () => {
    mocks.findMany.mockResolvedValue([product("product-a", "vendor-a", 100)]);
    await OrderService.createOrder({ ...input, items: [{ productId: "product-a", quantity: 2 }, { productId: "product-a", quantity: 3 }] });
    expect(mocks.updateProductStock).toHaveBeenCalledWith({ where: { id: "product-a", inventoryCount: { gte: 5 } }, data: { inventoryCount: { decrement: 5 } } });
    expect(mocks.createOrder).toHaveBeenCalledTimes(1);
  });

  it("rejects insufficient atomic stock before creating an order", async () => {
    mocks.findMany.mockResolvedValue([product("product-a", "vendor-a", 100)]);
    mocks.updateProductStock.mockResolvedValue({ count: 0 });
    await expect(OrderService.createOrder({ ...input, items: [{ productId: "product-a", quantity: 3 }] })).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("decrements only the selected variant stock source", async () => {
    mocks.findMany.mockResolvedValue([product("product-a", "vendor-a", 100, [{ id: "variant-a", price: 90 }])]);
    await OrderService.createOrder({ ...input, items: [{ productId: "product-a", variantId: "variant-a", quantity: 2 }] });
    expect(mocks.updateVariantStock).toHaveBeenCalledWith({ where: { id: "variant-a", inventoryCount: { gte: 2 } }, data: { inventoryCount: { decrement: 2 } } });
    expect(mocks.updateProductStock).not.toHaveBeenCalled();
  });
});
describe("authoritative checkout calculations", () => {
  it("reconciles exact Decimal line, vendor, shipping, tax, discount, and final totals", () => {
    const totals = calculateCheckoutTotals([
      { productId: "a", variantId: null, vendorId: "vendor-a", quantity: 2, unitPrice: new Decimal("12000"), commissionRate: new Decimal("10") },
      { productId: "b", variantId: null, vendorId: "vendor-b", quantity: 3, unitPrice: new Decimal("5000"), commissionRate: new Decimal("10") },
    ]);
    expect(Number(totals.items[0].lineSubtotal)).toBe(24000);
    expect(Number(totals.subtotal)).toBe(39000);
    expect(Number(totals.shipping)).toBe(7000);
    expect(Number(totals.tax)).toBe(0);
    expect(Number(totals.discount)).toBe(0);
    expect(Number(totals.total)).toBe(46000);
    expect(totals.vendorGroups.map((group) => Number(group.total))).toEqual([27500, 18500]);
  });

  it("rejects a negative authoritative price before an order can be persisted", () => {
    expect(() => calculateCheckoutTotals([{ productId: "a", variantId: null, vendorId: "vendor-a", quantity: 1, unitPrice: new Decimal("-1"), commissionRate: new Decimal("10") }])).toThrow(CheckoutError);
  });
});
