import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";
import { PaymentGateway, PaymentStatus } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  updateOrder: vi.fn(),
  createLedger: vi.fn(),
  createPayout: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({ prisma: {
  order: { findUnique: mocks.findUnique, update: mocks.updateOrder },
  paymentAttempt: { create: mocks.create },
  financialLedger: { create: mocks.createLedger },
  vendorPayout: { create: mocks.createPayout },
} }));

import { PaymentAttemptError, PaymentAttemptService } from "@/services/payment-attempt";

const order = {
  id: "order-a", orderNumber: "SD-1234567890ABCDEF", totalAmount: new Decimal("17500.00"),
  currency: "UGX", paymentStatus: PaymentStatus.PENDING,
};

describe("PaymentAttemptService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(order);
    mocks.create.mockImplementation(({ data }) => Promise.resolve({ id: "attempt-a", ...data }));
  });

  it("creates immutable server-derived amount and currency snapshots without payment side effects", async () => {
    const attempt = await PaymentAttemptService.createPaymentAttempt({
      orderId: "order-a", gateway: PaymentGateway.PESAPAL,
    });
    const data = mocks.create.mock.calls[0][0].data;

    expect(data).toMatchObject({
      orderId: "order-a", gateway: PaymentGateway.PESAPAL, amount: new Decimal("17500"),
      currency: "UGX", status: "CREATED",
    });
    expect(data.merchantReference).toMatch(/^SD-1234567890ABCDEF-P-[A-F0-9]{12}$/);
    expect(data.merchantReference).toHaveLength(34);
    expect(attempt.amount.toString()).toBe("17500");
    expect(mocks.updateOrder).not.toHaveBeenCalled();
    expect(mocks.createLedger).not.toHaveBeenCalled();
    expect(mocks.createPayout).not.toHaveBeenCalled();
  });

  it("permits multiple local attempts with distinct merchant references for one order", async () => {
    await PaymentAttemptService.createPaymentAttempt({ orderId: "order-a", gateway: PaymentGateway.PESAPAL });
    await PaymentAttemptService.createPaymentAttempt({ orderId: "order-a", gateway: PaymentGateway.PESAPAL });

    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(mocks.create.mock.calls[0][0].data.merchantReference)
      .not.toBe(mocks.create.mock.calls[1][0].data.merchantReference);
    expect(mocks.create.mock.calls.every((call) => call[0].data.providerTrackingId === undefined)).toBe(true);
  });

  it("does not create an attempt for an already completed order", async () => {
    mocks.findUnique.mockResolvedValue({ ...order, paymentStatus: PaymentStatus.COMPLETED });

    await expect(PaymentAttemptService.createPaymentAttempt({ orderId: "order-a", gateway: PaymentGateway.PESAPAL }))
      .rejects.toMatchObject({ code: "ORDER_ALREADY_PAID" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects a missing order before persistence", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(PaymentAttemptService.createPaymentAttempt({ orderId: "missing", gateway: PaymentGateway.PESAPAL }))
      .rejects.toBeInstanceOf(PaymentAttemptError);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
