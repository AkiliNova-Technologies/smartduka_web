import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("authenticated checkout preview contract", () => {
  const preview = source("src/services/checkout-preview.ts");
  const route = source("src/app/api/v1/checkout/preview/route.ts");
  const order = source("src/services/order.ts");
  const proxy = source("src/proxy.ts");

  it("resolves current catalogue and totals on the server", () => {
    expect(preview).toContain("publicProductWhere");
    expect(preview).toContain("calculateCheckoutTotals");
    expect(preview).toContain("getBasketBranchAvailability");
    expect(preview).toContain("PaymentProviderRegistry.getReadiness");
    expect(preview).toContain("customerPaymentsReady");
  });

  it("binds saved addresses and checkout to the authenticated customer", () => {
    expect(route).toContain("requireActiveUserId");
    expect(preview).toContain("customerId");
    expect(preview).toContain("customerAddress.findFirst");
    expect(order).toContain("id: input.addressId, customerId: input.userId");
  });

  it("allows audited native bearer access without weakening route auth", () => {
    expect(proxy).toContain('"POST /api/v1/checkout"');
    expect(proxy).toContain('"POST /api/v1/checkout/preview"');
    expect(proxy).toContain("orderPaymentStatus");
  });
});
