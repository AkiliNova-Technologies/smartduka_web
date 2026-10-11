import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const file = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const schema = file("prisma/schema.prisma");
const promotions = file("src/services/vendor-promotions.ts");
const entitlements = file("src/services/vendor-entitlement.ts");

describe("platform revenue engine boundary", () => {
  it("keeps vendor-to-platform revenue in dedicated records", () => {
    expect(schema).toContain("model PlatformRevenueOrder");
    expect(schema).toContain("model PlatformPaymentIntent");
    expect(schema).toContain("model PromotionCampaign");
    expect(schema).toContain("model PromotionCreditLedger");
  });

  it("starts trials only for active shops and grants introductory credit once", () => {
    expect(entitlements).toContain("vendor.status !== VendorStatus.ACTIVE");
    expect(entitlements).toContain("WELCOME_PROMOTION_CREDIT:${vendorId}");
    expect(entitlements).toContain("grantKey: creditKey");
  });

  it("calculates promotion pricing and ownership on the server", () => {
    expect(promotions).toContain("duration between 1 and 30 days");
    expect(promotions).toContain("product.findFirst");
    expect(promotions).toContain("vendorId,");
    expect(promotions).toContain("creditApplied");
    expect(promotions).toContain("idempotencyKey");
  });
});
