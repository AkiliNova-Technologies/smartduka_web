import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("homepage discovery data contracts", () => {
  const categories = source("src/services/category.ts");
  const marketing = source("src/services/marketing.ts");
  const discovery = source("src/components/home/HomeDiscovery.tsx");
  const featured = source("src/components/marketing/featured-sections.tsx");
  const vendorCard = source("src/components/marketplace/vendor-card.tsx");

  it("uses public-product eligibility and rolls the most-specific category up only once", () => {
    expect(categories).toContain('COALESCE(product."subCategoryId", product."categoryId")');
    expect(categories).toContain('product."status" IN');
    expect(categories).toContain('product."deletedAt" IS NULL');
    expect(categories).toContain('vendor."status" =');
    expect(categories).toContain('COUNT(product."id")');
  });

  it("limits homepage category work and respects category merchandising order", () => {
    expect(categories).toContain('ORDER BY root."sortOrder" ASC, COUNT(product."id") DESC');
    expect(categories).toContain("LIMIT 5");
  });

  it("returns only active, non-deleted, explicitly featured shops in priority order", () => {
    expect(marketing).toContain("vendor: { status: VendorStatus.ACTIVE, deletedAt: null }");
    expect(marketing).toContain("orderBy: featuredOrder, take: 4");
  });

  it("keeps featured-shop cards linked to their public storefronts", () => {
    expect(vendorCard).toContain("href={`/shops/${vendor.slug}`}");
  });

  it("uses balanced responsive category and featured-shop grids", () => {
    expect(discovery).toContain("grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5");
    expect(featured).toContain("sm:grid-cols-2 lg:grid-cols-4");
  });
});
