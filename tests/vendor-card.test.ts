import { describe, expect, it } from "vitest";
import { formatFulfilmentSummary, getShopInitials } from "@/components/marketplace/vendor-card";
import fs from "node:fs";
import path from "node:path";

describe("VendorCard presentation helpers", () => {
  it("uses compact initials when a shop has no logo", () => {
    expect(getShopInitials("Wati Fashions & Designers")).toBe("WF");
    expect(getShopInitials("  ")).toBe("S");
  });

  it.each([
    [["DELIVERY"], "Delivery"],
    [["PICKUP"], "Pickup"],
    [["DELIVERY", "PICKUP"], "Delivery & Pickup"],
    [[], null],
  ] as const)("summarizes %j fulfilment methods", (methods, expected) => {
    expect(formatFulfilmentSummary(methods)).toBe(expected);
  });

  it("uses one card link without a duplicate CTA or decorative commerce icons", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/marketplace/vendor-card.tsx"), "utf8");
    expect(source).toContain('href={`/shops/${vendor.slug}`}');
    expect(source).toContain("MapPin");
    expect(source).not.toContain("Visit Shop");
    expect(source).not.toContain("ArrowRight");
    expect(source).not.toContain("Package aria-hidden");
    expect(source).not.toContain("Truck aria-hidden");
  });
});
