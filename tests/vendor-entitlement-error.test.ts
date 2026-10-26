import { describe, expect, it } from "vitest";
import { isVendorEntitlementError } from "@/lib/vendor-entitlement-error";

describe("vendor entitlement error classification", () => {
  it("shows upgrade guidance only for entitlement restrictions", () => {
    expect(isVendorEntitlementError("Choose a Mwezora plan to access this feature.")).toBe(true);
    expect(isVendorEntitlementError("You've reached your plan limit of 25 active products.")).toBe(true);
    expect(isVendorEntitlementError("Photo upload failed.")).toBe(false);
    expect(isVendorEntitlementError("The database is temporarily unavailable.")).toBe(false);
  });
});
