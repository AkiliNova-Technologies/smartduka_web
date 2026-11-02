import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const statusService = readFileSync("src/services/payment-status.ts", "utf8");
const statusRoute = readFileSync("src/app/api/v1/orders/[id]/payment-status/route.ts", "utf8");
const paymentProvider = readFileSync("src/lib/payments/payment-provider.ts", "utf8");
const preview = readFileSync("src/services/checkout-preview.ts", "utf8");

describe("mobile direct-to-vendor payment orchestration contract", () => {
  it("scopes payment progress to the authenticated customer and seller suborders", () => {
    expect(statusRoute).toContain("requireActiveUserId()");
    expect(statusService).toContain("where: { id: orderId, customerId }");
    expect(statusService).toContain("vendorTotal");
    expect(statusService).toContain("paymentIntents");
  });

  it("only exposes provider-ready accounts and never infers payment success", () => {
    expect(statusService).toContain("customerPaymentsReady");
    expect(statusService).toContain('entry.status === "SUCCESSFUL"');
    expect(statusService).toContain('status === "REVERSED"');
    expect(preview).toContain("customerPaymentsReady");
  });

  it("does not advertise Airtel while its submission adapter is unavailable", () => {
    expect(paymentProvider).toMatch(/provider === "AIRTEL_MONEY"[\s\S]*\? false/);
  });

  it("blocks duplicate initiation while confirmation is pending", () => {
    expect(statusService).toContain('"CREATED", "PENDING", "AUTHORIZED"');
    expect(statusService).toContain("canInitiate: !intent");
    expect(statusService).toContain('"FAILED", "CANCELLED", "EXPIRED"');
  });
});
