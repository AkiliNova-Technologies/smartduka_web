import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findExistingOrder: vi.fn(),
  findMany: vi.fn(),
  updateProductStock: vi.fn(),
  updateVariantStock: vi.fn(),
  createOrder: vi.fn(),
  createSubOrder: vi.fn(),
  createMany: vi.fn(),
  notification: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({ prisma: {
  $transaction: mocks.transaction,
  order: { findFirst: mocks.findExistingOrder, create: mocks.createOrder },
  product: { findMany: mocks.findMany, updateMany: mocks.updateProductStock },
  productVariant: { updateMany: mocks.updateVariantStock },
  subOrder: { create: mocks.createSubOrder },
  orderItem: { createMany: mocks.createMany },
  notification: { create: mocks.notification },
} }));

import { CheckoutError, checkoutRequestHash, OrderService } from "@/services/order";

const input = {
  userId: "customer-a",
  checkoutRequestId: "checkout-request-0001",
  items: [{ productId: "product-a", quantity: 1 }],
  shippingAddress: " Kampala ",
  shippingPhone: "0700000000",
  paymentGateway: "CASH_ON_DELIVERY" as const,
};
const product = {
  id: "product-a", vendorId: "vendor-a", basePrice: 12000, variants: [],
  vendor: { subscriptions: [{ plan: { commissionRate: 10 } }] },
};
const p2002 = (target: string[] | string) => new Prisma.PrismaClientKnownRequestError(
  "Unique constraint failed", { code: "P2002", clientVersion: "7.8.0", meta: { target } },
);

function setupSuccessfulTransaction() {
  mocks.transaction.mockImplementation((callback) => callback({
    product: { findMany: mocks.findMany, updateMany: mocks.updateProductStock },
    productVariant: { updateMany: mocks.updateVariantStock },
    order: { create: mocks.createOrder }, subOrder: { create: mocks.createSubOrder },
    orderItem: { createMany: mocks.createMany }, notification: { create: mocks.notification },
  }));
}

describe("checkout idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findExistingOrder.mockResolvedValue(null);
    mocks.findMany.mockResolvedValue([product]);
    mocks.updateProductStock.mockResolvedValue({ count: 1 });
    mocks.updateVariantStock.mockResolvedValue({ count: 1 });
    mocks.createOrder.mockResolvedValue({ id: "new-order", paymentStatus: "PENDING" });
    mocks.createSubOrder.mockResolvedValue({ id: "suborder-a", subOrderNumber: "SD-1-V1" });
    mocks.createMany.mockResolvedValue({ count: 1 });
    mocks.notification.mockResolvedValue({});
    setupSuccessfulTransaction();
  });

  it("returns an existing matching order without repeating stock or notification writes", async () => {
    const existing = { id: "order-a", paymentStatus: "PENDING", checkoutRequestHash: checkoutRequestHash(input) };
    mocks.findExistingOrder.mockResolvedValue(existing);

    await expect(OrderService.createOrder(input)).resolves.toBe(existing);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.updateProductStock).not.toHaveBeenCalled();
    expect(mocks.notification).not.toHaveBeenCalled();
  });

  it("rejects a reused key with changed checkout intent", async () => {
    mocks.findExistingOrder.mockResolvedValue({ id: "order-a", checkoutRequestHash: "different" });

    await expect(OrderService.createOrder(input)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("hashes equivalent item ordering deterministically", () => {
    const reversed = { ...input, items: [
      { productId: "product-b", quantity: 2 }, { productId: "product-a", quantity: 1 },
    ] };
    const ordered = { ...reversed, items: [...reversed.items].reverse() };
    expect(checkoutRequestHash(reversed)).toBe(checkoutRequestHash(ordered));
  });

  it("allows different customers to use the same request ID", async () => {
    await OrderService.createOrder(input);
    await OrderService.createOrder({ ...input, userId: "customer-b" });
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(mocks.createOrder.mock.calls[0][0].data.customerId).toBe("customer-a");
    expect(mocks.createOrder.mock.calls[1][0].data.customerId).toBe("customer-b");
  });

  it("allows a later retry after a failed transaction because no order was committed", async () => {
    mocks.transaction.mockRejectedValueOnce(new CheckoutError("No stock", "INSUFFICIENT_STOCK"));
    await expect(OrderService.createOrder(input)).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    await expect(OrderService.createOrder(input)).resolves.toMatchObject({ id: "new-order" });
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });

  it("returns the matching committed winner after the idempotency P2002 race", async () => {
    const winner = { id: "winner", paymentStatus: "PENDING", checkoutRequestHash: checkoutRequestHash(input) };
    mocks.transaction.mockRejectedValue(p2002(["customerId", "checkoutRequestId"]));
    mocks.findExistingOrder.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);

    await expect(OrderService.createOrder(input)).resolves.toBe(winner);
    expect(mocks.findExistingOrder).toHaveBeenCalledTimes(2);
  });

  it("rejects a P2002 winner whose request hash conflicts", async () => {
    mocks.transaction.mockRejectedValue(p2002(["customerId", "checkoutRequestId"]));
    mocks.findExistingOrder.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "winner", checkoutRequestHash: "different" });

    await expect(OrderService.createOrder(input)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("does not classify an unrelated P2002 as an idempotency replay", async () => {
    const error = p2002(["orderNumber"]);
    mocks.transaction.mockRejectedValue(error);

    await expect(OrderService.createOrder(input)).rejects.toBe(error);
    expect(mocks.findExistingOrder).toHaveBeenCalledTimes(1);
  });
});
