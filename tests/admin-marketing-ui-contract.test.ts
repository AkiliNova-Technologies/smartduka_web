import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin marketing design-system contract", () => {
  it("uses the shared admin header, data table, and icon-only row actions", () => {
    const promotions = source("src/components/marketing/promotions-manager.tsx");
    const featured = source("src/components/marketing/featured-ranking-list.tsx");
    for (const content of [promotions, featured]) {
      expect(content).toContain("DashboardPageHeader");
      expect(content).toContain("DataTable");
      expect(content).toContain("DataTableRowActions");
    }
    expect(featured).toContain("AlertDialog");
  });

  it("renders hero previews with the actual responsive marketplace hero", () => {
    const preview = source("src/components/marketing/admin/promotion/promotion-preview.tsx");
    expect(preview).toContain("HeroCarousel");
    expect(preview).toContain("Your next featured story starts here");
    expect(preview).toContain("mobileImage");
    expect(preview).toContain("ctaLabel");
  });

  it("provides accessible desktop and mobile preview modes and disables interactions", () => {
    const shell = source("src/components/marketing/admin/marketing-preview-shell.tsx");
    expect(shell).toContain('aria-label="Preview viewport"');
    expect(shell).toContain('value="desktop"');
    expect(shell).toContain('value="mobile"');
    expect(shell).toContain("inert");
    expect(shell).toContain("pointer-events-none");
  });

  it("uses real customer-facing cards for shop and product previews", () => {
    expect(source("src/components/marketing/featured-shops-manager.tsx")).toContain("FeaturedShopCard");
    expect(source("src/components/marketing/featured-products-manager.tsx")).toContain("ProductCard");
    expect(source("src/components/marketing/featured-shops-manager.tsx")).toContain("sponsored: false");
  });

  it("keeps form validation and duplicate-submission protection", () => {
    const form = source("src/components/marketing/admin/promotion/promotion-form.tsx");
    expect(form).toContain("Enter a promotion title.");
    expect(form).toContain("Upload a desktop banner.");
    expect(form).toContain("End time must be after the start time.");
    expect(form).toContain("disabled={saving}");
  });
});
