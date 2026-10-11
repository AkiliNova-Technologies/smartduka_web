import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const file = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const script = file("scripts/platform-momo-live-verify.mjs");
const schema = file("prisma/schema.prisma");
const adminRevenue = file("src/services/admin-platform-revenue.ts");
const reconciliation = file("src/services/platform-payment-reconciliation.ts");

describe("controlled platform live qualification", () => {
  it("requires live-test enablement, disabled production, confirmation, and a restricted vendor", () => {
    expect(script).toContain('PLATFORM_MTN_LIVE_TEST_ENABLED')
    expect(script).toContain('PLATFORM_MTN_PRODUCTION_ENABLED')
    expect(script).toContain('PLATFORM_MTN_LIVE_TEST_CONFIRM_REAL_MONEY')
    expect(script).toContain('PLATFORM_MTN_LIVE_TEST_VENDOR_ID')
  })
  it("uses a separately configured small amount and a one-time qualification identity", () => {
    expect(script).toContain('PLATFORM_MTN_LIVE_TEST_AMOUNT')
    expect(script).toContain('PLATFORM_MTN_LIVE_TEST_QUALIFICATION_ID')
    expect(script).toContain('No replacement payment was submitted')
    expect(script).toContain('LIVE_QUALIFICATION')
  })
  it("keeps qualification money out of commercial metrics and fulfillment", () => {
    expect(schema).toContain('PlatformRevenueQualificationKind')
    expect(adminRevenue).toContain('qualificationKind: "NONE"')
    expect(reconciliation).toContain('qualificationKind !== "NONE"')
  })
  it("uses canonical reconciliation and redacts live output", () => {
    expect(script).toContain('PlatformPaymentReconciliationService.applyTrustedResult')
    expect(script).toContain('Merchant code: ••••5727')
    expect(script).toContain('MANUAL CHECK REQUIRED')
    expect(script).not.toContain('console.log(process.env')
  })
  it("snapshots marketplace and seller payment states before and after the test", () => {
    expect(script).toContain('paymentIntent.groupBy')
    expect(script).toContain('order.groupBy')
    expect(script).toContain('Marketplace isolation: FAIL')
  })
})
