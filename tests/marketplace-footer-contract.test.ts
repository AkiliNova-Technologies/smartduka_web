import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const source = readFileSync(resolve(process.cwd(), "src/components/layout/MarketplaceFooter.tsx"), "utf8");
describe("UI-11A marketplace footer", () => {
  it("provides a branded marketplace block and intentional real-route groups", () => {
    for (const value of ["Shop from local businesses in one place.", "Shop", "Account", "Help", "Sell on SmartDuka", "/products", "/categories", "/shops", "/orders", "/wishlist", "/settings", "/help", "/become-seller"]) expect(source).toContain(value);
  });
  it("keeps the footer compact, accessible, and includes a restrained bottom bar", () => {
    expect(source).toContain("All Rights Reserved");
    expect(source).toContain("Pay with");
    expect(source).toContain("focus-visible:ring-2");
    expect(source).toContain("max-w-7xl");
    expect(source).not.toContain("mailto:");
    expect(source).not.toContain("twitter");
  });
});
