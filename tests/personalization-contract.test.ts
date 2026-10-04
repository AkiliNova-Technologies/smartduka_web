import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("marketplace personalization contracts", () => {
  it("records only resolved product-detail views and retains bounded guest history", () => {
    const detail = source("src/app/(customer)/products/[slug]/ProductDetailContent.tsx");
    const provider = source("src/providers/UserDataProvider.tsx");
    expect(detail).toContain("trackProductView(product.id)");
    expect(provider).toContain("slice(0, 24)");
    expect(provider).toContain("smartduka-recently-viewed-timestamps");
  });

  it("uses the canonical card serializer and excludes non-public shops from history", () => {
    const service = source("src/services/recently-viewed.ts");
    expect(service).toContain("serializeMarketplaceProduct");
    expect(service).toContain('vendor: { status: "ACTIVE" as const, deletedAt: null }');
    expect(service).toContain("RECENTLY_VIEWED_HISTORY_LIMIT = 24");
  });

  it("keeps private recommendations separate, bounded, and diverse", () => {
    const service = source("src/services/recommendations.ts");
    const grid = source("src/components/home/ProductGrid.tsx");
    expect(service).toContain("CANDIDATE_LIMIT = 72");
    expect(service).toContain("MAX_PER_VENDOR = 2");
    expect(service).toContain("MAX_PER_CATEGORY = 3");
    expect(service).not.toContain('"use cache"');
    expect(grid).toContain("Recommended for you");
    expect(grid).toContain("Discover products");
  });

  it("uses concise, separate homepage treatments for discovery and history", () => {
    const home = source("src/app/(customer)/page.tsx");
    const grid = source("src/components/home/ProductGrid.tsx");
    expect(grid).toContain("Picked from what you’ve been exploring.");
    expect(grid).toContain("Popular picks from across SmartDuka.");
    expect(grid).toContain("Continue where you left off.");
    expect(grid).toContain("slice(0, 8)");
    expect(grid).toContain("if (!recentlyViewed.length) return null");
    expect(home.indexOf("<ProductGrid")).toBeLessThan(home.indexOf("<FeaturedShopsSection"));
    expect(home.indexOf("<FeaturedShopsSection")).toBeLessThan(home.indexOf("<RecentlyViewedSection"));
  });
});
