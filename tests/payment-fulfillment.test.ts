import { describe, expect, it } from "vitest";
import { PaymentGateway, PaymentIntentStatus } from "@prisma/client";
import { canFulfillSubOrder } from "@/services/payment-fulfillment";

describe("direct MTN fulfilment protection", () => {
  it.each([
    PaymentIntentStatus.CREATED,
    PaymentIntentStatus.PENDING,
    PaymentIntentStatus.FAILED,
    PaymentIntentStatus.CANCELLED,
    PaymentIntentStatus.EXPIRED,
    PaymentIntentStatus.REVERSED,
  ])("blocks %s", (status) => {
    expect(canFulfillSubOrder({ paymentGateway: PaymentGateway.MTN_MOMO, paymentIntentStatuses: [status] })).toBe(false);
  });

  it("unlocks only the paid seller suborder", () => {
    expect(canFulfillSubOrder({ paymentGateway: PaymentGateway.MTN_MOMO, paymentIntentStatuses: [PaymentIntentStatus.SUCCESSFUL] })).toBe(true);
    expect(canFulfillSubOrder({ paymentGateway: PaymentGateway.MTN_MOMO, paymentIntentStatuses: [PaymentIntentStatus.PENDING] })).toBe(false);
  });

  it("keeps cash-on-delivery fulfilment independent of MTN payment state", () => {
    expect(canFulfillSubOrder({ paymentGateway: PaymentGateway.CASH_ON_DELIVERY, paymentIntentStatuses: [] })).toBe(true);
  });
});
