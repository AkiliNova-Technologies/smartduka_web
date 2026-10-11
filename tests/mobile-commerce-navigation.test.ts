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

  it("renders a safe-area-aware five-item navigation with active semantics", () => {
    for (const label of ["Home", "Categories", "Search", "Cart", "Account"]) {
      expect(navigation).toContain(label);
    }
    expect(navigation).toContain("pb-[env(safe-area-inset-bottom)]");
    expect(navigation).toContain("grid-cols-5");
    expect(navigation).toContain('aria-current={active ? "page" : undefined}');
    expect(navigation).toContain("font-semibold text-primary");
    expect(navigation).toContain('cartCount > 99 ? "99+" : cartCount');
  });

  it("marks nested account routes active", () => {
    for (const route of ["/settings", "/orders", "/wishlist"]) {
      expect(navigation).toContain(route);
    }
  });

  it("uses a mobile back link and positions purchase controls above the navigation", () => {
    expect(detail).toContain("<ChevronLeft");
    expect(detail).toContain('aria-label="Back to products"');
    expect(detail).toContain("lg:hidden");
    expect(detail).toContain("bottom-[calc(3.5rem+env(safe-area-inset-bottom))]");
  });
});
