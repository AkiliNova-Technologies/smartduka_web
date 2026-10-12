import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("vendor settings Decimal boundary", () => {
  const actions = source("src/actions/vendor-settings.ts");
  const form = source("src/components/vendor/settings/fulfillment-policy-tab.tsx");

  it("submits delivery fees as strings and validates decimal precision", () => {
    expect(form).toContain("deliveryFee: fee");
    expect(form).not.toContain("deliveryFee: Number(fee)");
    expect(actions).toContain("vendorDeliveryFeeSchema.optional()");
    expect(actions).toContain('deliveryFee: methods.includes("DELIVERY") ? deliveryFee : "0"');
  });

  it("returns restricted plain projections from profile mutations", () => {
    expect(actions).toContain("select: { id: true, storeName: true");
    expect(actions).toContain("select: { id: true, logoUrl: true }");
    expect(actions).toContain("select: { id: true, bannerUrl: true }");
  });

  it("serializes the full settings profile through the vendor DTO", () => {
    expect(actions).toContain("data: toVendorProfileDto(");
  });
});
