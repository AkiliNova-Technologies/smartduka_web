import { describe, expect, it } from "vitest";
import { clampMarketplacePage, parseMarketplaceFilters, parseMarketplacePage } from "@/lib/marketplace-page";

describe("marketplace page parsing", () => {
  it.each([[undefined, 1], ["", 1], ["abc", 1], ["-1", 1], ["1.5", 1], ["2", 2]])("parses %s as page %s", (value, page) => {
    expect(parseMarketplacePage(value)).toBe(page);
  });

  it("clamps an oversized or removed final page to the available range", () => {
    expect(clampMarketplacePage(999, 2)).toBe(2);
    expect(clampMarketplacePage(2, 1)).toBe(1);
    expect(clampMarketplacePage(-1, 3)).toBe(1);
  });

  it("normalizes catalogue query arguments for distinct cache entries", () => {
    expect(parseMarketplaceFilters({ search: "  shirt ", sort: "price-asc", minPrice: "100", maxPrice: "200.50", inStock: "1", sizes: "M,L", colors: "Blue", page: "2" })).toEqual({
      search: "shirt", sort: "price-asc", page: 2,
      filters: { categoryId: undefined, minPrice: 100, maxPrice: 200.5, inStock: true, brand: undefined, sizes: ["M", "L"], colors: ["Blue"] },
    });
  });
});
