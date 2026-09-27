import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireActiveUserId: vi.fn(), createOrder: vi.fn() }));

vi.mock("@/lib/auth/session", () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  AccountInactiveError: class AccountInactiveError extends Error {},
  requireActiveUserId: mocks.requireActiveUserId,
}));
vi.mock("@/services/order", () => ({
  CheckoutError: class CheckoutError extends Error {
    constructor(message: string, public readonly code: string) { super(message); }
  },
  OrderService: { createOrder: mocks.createOrder, getUserOrders: vi.fn() },
}));

import { CheckoutError } from "@/services/order";
import { POST } from "@/app/api/orders/route";

const request = () => new Request("http://smartduka.test/api/orders", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    items: [{ productId: "product-a", quantity: 1 }],
    checkoutRequestId: "checkout-request-0001",
    shippingAddress: "Kampala",
    shippingPhone: "0700000000",
    paymentGateway: "CASH_ON_DELIVERY",
  }),
});

describe("orders idempotency API", () => {
  it("returns 409 for conflicting reuse of an idempotency key", async () => {
    mocks.requireActiveUserId.mockResolvedValue("customer-a");
    mocks.createOrder.mockRejectedValue(
      new CheckoutError("Checkout request conflict", "IDEMPOTENCY_CONFLICT"),
    );

    expect((await POST(request() as never)).status).toBe(409);
  });

  it("strips browser-supplied financial, vendor, and customer authority fields", async () => {
    mocks.requireActiveUserId.mockResolvedValue("customer-a");
    mocks.createOrder.mockResolvedValue({ id: "order-a" });
    const response = await POST(new Request("http://smartduka.test/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: "product-a", quantity: 1, price: 1, vendorId: "forged-vendor" }],
        checkoutRequestId: "checkout-request-0002",
        shippingAddress: "Kampala",
        shippingPhone: "0700000000",
        paymentGateway: "CASH_ON_DELIVERY",
        customerId: "forged-customer",
        vendorId: "forged-vendor",
        subTotal: 0,
        totalShipping: 0,
        taxAmount: 0,
        totalAmount: 0,
        paymentStatus: "COMPLETED",
        currency: "USD",
      }),
    }) as never);

    expect(response.status).toBe(201);
    expect(mocks.createOrder).toHaveBeenLastCalledWith({
      userId: "customer-a",
      items: [{ productId: "product-a", quantity: 1 }],
      checkoutRequestId: "checkout-request-0002",
      shippingAddress: "Kampala",
      shippingPhone: "0700000000",
      shippingEmail: undefined,
      paymentGateway: "CASH_ON_DELIVERY",
      notes: undefined,
    });
  });
});
