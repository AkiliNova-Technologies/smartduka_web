import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("shop moderation cross-surface regression contract", () => {
  it("shares the active-shop predicate across catalogue, storefront and checkout reads", () => {
    const eligibility = source("src/lib/marketplace-eligibility.ts");
    expect(eligibility).toContain("status: VendorStatus.ACTIVE");
    expect(source("src/services/product.ts")).toContain("publicProductWhere");
    expect(source("src/services/vendor.ts")).toContain("publicShopWhere");
    expect(source("src/services/order.ts")).toContain("...publicProductWhere");
    expect(source("src/app/api/v1/products/route.ts")).toContain("ProductService.getPublicCatalogProducts");
  });

  it("hides suspended paid ads while retaining confirmed reservations for restoration", () => {
    const marketing = source("src/services/marketing.ts");
    const scheduler = source("src/services/promotion-campaign-scheduler.ts");
    expect(marketing).toContain("reservation: { status: \"CONFIRMED\" }");
    expect(marketing).toContain("vendor: { status: VendorStatus.ACTIVE, deletedAt: null }");
    expect(scheduler).toContain("promotionRecoveryShopStatuses");
    expect(scheduler).toContain("VendorStatus.BANNED, VendorStatus.CANCELLED");
    expect(scheduler).not.toContain("status: { not: VendorStatus.ACTIVE }");
  });

  it("invalidates catalogue, shop, discovery and promotion caches after moderation", () => {
    const action = source("src/actions/admin.ts");
    for (const tag of [
      "cacheTags.marketplace.shops",
      "cacheTags.marketplace.products",
      "cacheTags.marketplace.discovery",
      "cacheTags.marketplace.promotions",
      "cacheTags.shopSlug(result.vendorSlug)",
    ]) expect(action).toContain(tag);
  });

  it("keeps marketplace purchases seller-routed and platform advertising revenue separate", () => {
    const checkout = source("src/services/order.ts");
    const payment = source("src/services/payment-eligibility.ts");
    expect(checkout).toContain("commissionRate: ZERO");
    expect(checkout).toContain("paymentAccounts");
    expect(payment).toContain("active vendor, never SmartDuka");
    expect(source("src/services/platform-payment.ts")).toContain("platformRevenueOrder");
  });
});
