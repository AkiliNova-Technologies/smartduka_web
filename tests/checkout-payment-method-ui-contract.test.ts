import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/(customer)/checkout/page.tsx"), "utf8");

describe("checkout payment method", () => {
  it("creates the order before seller-specific direct payment", () => {
    expect(source).toContain("Payment happens per shop");
    expect(source).toContain("Payments go directly to that seller’s verified merchant account.");
    expect(source).toContain('paymentGateway: "MTN_MOMO"');
  });

  it("does not route the cart through a marketplace payment collector", () => {
    expect(source).not.toContain("PESAPAL");
    expect(source).not.toContain("/api/payments/pesapal/initiate");
    expect(source).toContain("router.push(`/orders/${result.orderId}`)");
  });

  it("does not claim payment availability before seller routing is verified", () => {
    expect(source).toContain("Availability is confirmed per shop");
    expect(source).toContain("marketplace payments are not enabled until direct merchant routing is verified");
  });
});
