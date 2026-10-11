import { describe, expect, it } from "vitest";
import { deriveParentPaymentProgress } from "@/services/payment-progress";

const subOrder = (...statuses: string[]) => ({ paymentIntents: statuses.map((status) => ({ status })) });
describe("multi-vendor payment progress", () => {
  it("derives unpaid, partial, and complete states without cross-vendor leakage", () => {
    expect(deriveParentPaymentProgress([subOrder("FAILED"), subOrder("PENDING")])).toBe("PENDING");
    expect(deriveParentPaymentProgress([subOrder("SUCCESSFUL"), subOrder("PENDING")])).toBe("PARTIALLY_PAID");
    expect(deriveParentPaymentProgress([subOrder("FAILED"), subOrder("SUCCESSFUL")])).toBe("PARTIALLY_PAID");
    expect(deriveParentPaymentProgress([subOrder("SUCCESSFUL"), subOrder("SUCCESSFUL")])).toBe("COMPLETED");
  });
  it("does not treat a failed seller or duplicate successful intent as another seller payment", () => {
    expect(deriveParentPaymentProgress([subOrder("SUCCESSFUL", "SUCCESSFUL"), subOrder("FAILED")])).toBe("PARTIALLY_PAID");
  });
  it("surfaces a seller reversal as a parent payment exception without changing another seller's payment", () => {
    expect(deriveParentPaymentProgress([subOrder("SUCCESSFUL"), subOrder("REVERSED")])).toBe("PAYMENT_EXCEPTION");
    expect(deriveParentPaymentProgress([subOrder("REVERSED")])).toBe("PAYMENT_EXCEPTION");
  });
});
