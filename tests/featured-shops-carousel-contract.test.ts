import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("featured shops carousel", () => {
  const carousel = source("src/components/marketing/featured-shops-carousel.tsx");
  const card = source("src/components/marketing/featured-shop-card.tsx");
  const marketing = source("src/services/marketing.ts");

  it("shows one hero-style shop at a time with swipe and keyboard navigation", () => {
    expect(carousel).toContain("shops[currentIndex]");
    expect(carousel).toContain("onTouchStart");
    expect(carousel).toContain("onTouchEnd");
    expect(carousel).toContain("onKeyDown");
    expect(carousel).toContain('aria-label="Previous featured shops"');
    expect(carousel).toContain('aria-label="Next featured shops"');
    expect(carousel).toContain('aria-label="Featured shop slides"');
    expect(carousel).toContain("prefers-reduced-motion: reduce");
  });

  it("hides redundant controls for a single shop", () => {
    expect(carousel).toContain("shops.length > 1");
  });

  it("renders sponsorship, verification, fallbacks, and the canonical store link", () => {
    expect(card).toContain("Sponsored");
    expect(card).toContain("<ShopVerificationBadge compact");
    expect(card).toContain("SHOP_BANNER_FALLBACK");
    expect(card).toContain("SHOP_LOGO_FALLBACK");
    expect(card).toContain("Explore Store");
    expect(card).toContain("href={`/shops/${shop.slug}`}");
    expect(card).toContain("bg-gradient-to-r");
    expect(card).toContain("min-h-[25rem]");
  });

  it("keeps paid capacity and deterministic ordering while allowing curated fill", () => {
    expect(marketing).toContain("Math.min(4, inventory.capacity)");
    expect(marketing).toContain('orderBy: [{ reservation: { confirmedAt: "asc" } }, { id: "asc" }]');
    expect(marketing).toContain("...paid.map");
    expect(marketing).toContain("...curated");
    expect(marketing).toContain("slice(0, publicShopLimit)");
  });
});
