import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { VendorEntitlementService } from "@/services/vendor-entitlement";

describe("product draft and publishing entitlement", () => {
  it("allows the approved active trial to publish products", () => {
    expect(VendorEntitlementService.hasCapability({ status: "TRIAL" }, "PRODUCT_PUBLISHING")).toBe(true);
  });

  it("does not allow an expired trial to publish", () => {
    expect(VendorEntitlementService.hasCapability({ status: "LIMITED" }, "PRODUCT_PUBLISHING")).toBe(false);
  });

  it("checks publishing capability only for a published create", () => {
    const source = readFileSync(resolve(process.cwd(), "src/services/product.ts"), "utf8");
    expect(source).toContain('if (input.status === "PUBLISHED") VendorEntitlementService.requireCapability');
  });
});
