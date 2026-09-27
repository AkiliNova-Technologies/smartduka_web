/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";
const mocks = vi.hoisted(() => ({
  tx: vi.fn(),
  sub: vi.fn(),
  subUpdate: vi.fn(),
  product: vi.fn(),
  variant: vi.fn(),
  refund: vi.fn(),
  attempt: vi.fn(),
  user: vi.fn(),
  vendor: vi.fn(),
  admin: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({ prisma: { $transaction: mocks.tx } }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: mocks.user }));
vi.mock("@/lib/auth/vendor-context", () => ({
  requireVendorContext: mocks.vendor,
}));
vi.mock("@/lib/auth/admin-context", () => ({
  requireAdminContext: mocks.admin,
}));
import { ReturnsRefundsService } from "@/services/returns-refunds";
const tx = {
  subOrder: { findUnique: mocks.sub, update: mocks.subUpdate },
  product: { update: mocks.product },
  productVariant: { update: mocks.variant },
  refund: { create: mocks.refund },
  paymentAttempt: { findFirst: mocks.attempt },
};
const sub = (x: Record<string, unknown> = {}) => ({
  id: "sub-a",
  orderId: "order-a",
  vendorId: "vendor-a",
  status: "PENDING",
  vendorSubTotal: new Decimal("100"),
  order: {
    customerId: "customer-a",
    paymentStatus: "PENDING",
    currency: "UGX",
  },
  items: [
    { id: "item-a", productId: "product-a", variantId: null, quantity: 2 },
  ],
  ...x,
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.tx.mockImplementation((f: Function) => f(tx));
  mocks.sub.mockResolvedValue(sub());
  mocks.subUpdate.mockImplementation(({ data }: any) => ({
    id: "sub-a",
    ...data,
  }));
  mocks.product.mockResolvedValue({});
  mocks.variant.mockResolvedValue({});
  mocks.refund.mockResolvedValue({ id: "refund", status: "REQUESTED" });
  mocks.user.mockResolvedValue("customer-a");
  mocks.vendor.mockResolvedValue({
    user: { id: "vendor-user-a" },
    vendorId: "vendor-a",
  });
});
describe("Phase 3K cancellation and restocking", () => {
  it("permits only the owning customer or vendor and rejects another tenant", async () => {
    await expect(
      ReturnsRefundsService.cancelSubOrderForCurrentCustomer("sub-a"),
    ).resolves.toMatchObject({ status: "CANCELLED" });
    await expect(
      ReturnsRefundsService.cancelSubOrder("sub-a", { userId: "customer-b" }),
    ).rejects.toThrow("not found");
    mocks.sub.mockResolvedValue(sub({ vendorId: "vendor-b" }));
    await expect(
      ReturnsRefundsService.cancelSubOrderForCurrentVendor("sub-a"),
    ).rejects.toThrow("not found");
  });
  it("rejects cancellation after fulfillment has begun", async () => {
    mocks.sub.mockResolvedValue(sub({ status: "SHIPPED" }));
    await expect(
      ReturnsRefundsService.cancelSubOrderForCurrentCustomer("sub-a"),
    ).rejects.toThrow("only before fulfillment");
  });
  it("cancels unpaid orders, restores stock, and creates no refund", async () => {
    await ReturnsRefundsService.cancelSubOrderForCurrentCustomer("sub-a");
    expect(mocks.product).toHaveBeenCalledWith({
      where: { id: "product-a" },
      data: { inventoryCount: { increment: 2 } },
    });
    expect(mocks.refund).not.toHaveBeenCalled();
  });
  it("creates only a REQUESTED refund for a paid cancellation", async () => {
    mocks.sub.mockResolvedValue(
      sub({
        order: {
          customerId: "customer-a",
          paymentStatus: "COMPLETED",
          currency: "UGX",
        },
      }),
    );
    await ReturnsRefundsService.cancelSubOrderForCurrentCustomer("sub-a");
    expect(mocks.refund).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REQUESTED" }),
      }),
    );
  });
  it("is exactly-once: a repeated cancellation does not restock again", async () => {
    await ReturnsRefundsService.cancelSubOrderForCurrentCustomer("sub-a");
    mocks.sub.mockResolvedValue(sub({ status: "CANCELLED" }));
    await ReturnsRefundsService.cancelSubOrderForCurrentCustomer("sub-a");
    expect(mocks.product).toHaveBeenCalledTimes(1);
  });
});
