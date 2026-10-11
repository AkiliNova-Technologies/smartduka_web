import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const file = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const payment = file("src/services/platform-payment.ts");
const reconciliation = file("src/services/platform-payment-reconciliation.ts");
describe("platform payment boundary", () => {
  it("does not use marketplace PaymentIntent or direct-routing readiness", () => {
    expect(payment).not.toContain("paymentIntent.find");
    expect(payment).not.toContain("DIRECT_VENDOR_ROUTING_VERIFIED");
    expect(payment).toContain("platformPaymentIntent");
  });
  it("keeps uncertain provider submission pending and guards duplicate charges", () => {
    expect(payment).toContain('"SUBMISSION_UNKNOWN", "RATE_LIMITED"');
    expect(payment).toContain('status: "PENDING"');
    expect(payment).toContain("A payment is already awaiting confirmation");
  });
  it("allows trusted reconciliation to activate or reverse campaign delivery", () => {
    expect(reconciliation).toContain('next === "SUCCESSFUL"');
    expect(reconciliation).toContain('status: "PAID"');
    expect(reconciliation).toContain('next === "REVERSED"');
    expect(reconciliation).toContain('status: "REVIEW_REQUIRED"');
  });
});
