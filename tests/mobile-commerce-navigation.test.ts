import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("mobile commerce navigation", () => {
  const header = source("src/components/layout/Header.tsx");
  const navigation = source("src/components/layout/MobileCommerceNav.tsx");
  const detail = source(
    "src/app/(customer)/products/[slug]/ProductDetailContent.tsx",
  );

  it("keeps the compact mobile header focused on menu, brand, search, and cart", () => {
    expect(header).toContain('aria-label="Open menu"');
    expect(header).toContain("MarketplaceSearch mobileTrigger");
    expect(header).toContain("<CartButton />");
    expect(header).toContain('className="hidden md:block"');
    expect(
      source("src/components/layout/CustomerNavigationSheet.tsx"),
    ).toContain("NotificationsSheet");
  });

  it("renders a safe-area-aware floating five-item navigation with active semantics", () => {
    for (const label of ["Home", "Categories", "Search", "Cart", "Account"]) {
      expect(navigation).toContain(label);
    }
    expect(navigation).toContain("env(safe-area-inset-bottom)+0.75rem");
    expect(navigation).toContain("rounded-2xl");
    expect(navigation).toContain('aria-current={active ? "page" : undefined}');
    expect(navigation).toContain("bg-primary/10");
    expect(navigation).toContain('cartCount > 99 ? "99+" : cartCount');
  });

  it("marks nested account routes active", () => {
    for (const route of ["/settings", "/orders", "/wishlist"]) {
      expect(navigation).toContain(route);
    }
  });

  it("uses a mobile back link and positions purchase controls above the navigation", () => {
    expect(detail).toContain("<ArrowLeft aria-hidden");
    expect(detail).toContain("Back to products");
    expect(detail).toContain("md:hidden");
    expect(detail).toContain("bottom-[calc(5.5rem+env(safe-area-inset-bottom))]");
  });
});
