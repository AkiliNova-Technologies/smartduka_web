import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("catalog filters and promotional fallbacks", () => {
  const filters = source("src/components/marketplace/catalog-filters.tsx");
  const service = source("src/services/product.ts");
  const promotions = source("src/components/marketing/promotion-section.tsx");

  it("uses a right-side Sheet with draft Apply and Clear controls", () => {
    expect(filters).toContain('side="right"');
    expect(filters).toContain("Apply filters");
    expect(filters).toContain("Clear all");
  });

  it("keeps category, price, stock, and structured-brand filters in URL state", () => {
    expect(filters).toContain('"category",');
    expect(filters).toContain('"minPrice",');
    expect(filters).toContain('"inStock",');
    expect(filters).toContain('"brand",');
    expect(filters).toContain('next.delete("page")');
    expect(filters).toContain("valid price range in UGX");
  });

  it("filters variants with their eligible price and inventory projections on the server", () => {
    expect(service).toContain('variants: { some: { isActive: true, inventoryCount: { gt: 0 }, price } }');
    expect(service).toContain('variants: { some: { isActive: true, inventoryCount: { gt: 0 } } }');
  });

  it("uses presentation-only Products and Shops fallbacks only after an empty response", () => {
    expect(promotions).toContain("PRODUCTS: { id: \"products-discovery\"");
    expect(promotions).toContain("SHOPS: { id: \"shops-discovery\"");
    expect(promotions.indexOf("if (data.length)")).toBeLessThan(promotions.indexOf("if (fallback)"));
    expect(promotions).toContain('href: "/products"');
    expect(promotions).toContain('href: "/shops"');
  });
});
