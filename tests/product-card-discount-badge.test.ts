import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateDiscountPercentage } from "@/lib/commerce/pricing";
import { serializeMarketplaceProduct } from "@/services/product";

const card = readFileSync(
  resolve(process.cwd(), "src/components/marketplace/product-card.tsx"),
  "utf8",
);

describe("product card discount percentage", () => {
  it("calculates a rounded positive percentage", () => {
    expect(calculateDiscountPercentage(91, 100)).toBe(9);
    expect(calculateDiscountPercentage(74.4, 100)).toBe(26);
  });

  it.each([
    [100, 100],
    [110, 100],
    [100, 0],
    [Number.NaN, 100],
    [100, Number.NaN],
    [Number.POSITIVE_INFINITY, 100],
    [100, Number.POSITIVE_INFINITY],
    [99.6, 100],
  ])("rejects invalid or non-visible discounts (%s, %s)", (price, compareAt) => {
    expect(calculateDiscountPercentage(price, compareAt)).toBeNull();
  });

  it("uses the canonical displayed variant price", () => {
    const product = serializeMarketplaceProduct({
      id: "product-1",
      name: "Variant product",
      slug: "variant-product",
      brand: null,
      basePrice: 95,
      compareAtPrice: 100,
      inventoryCount: 0,
      vendorId: "vendor-1",
      vendor: { storeName: "Store" },
      images: [],
      reviews: [],
      variants: [
        { isActive: true, inventoryCount: 2, price: 80 },
        { isActive: true, inventoryCount: 3, price: 90 },
      ],
    });

    expect(product.basePrice).toBe(80);
    expect(calculateDiscountPercentage(product.basePrice, product.compareAtPrice)).toBe(20);
  });

  it("positions Deal and percentage badges at opposite bottom corners", () => {
    expect(card).toContain('"absolute bottom-2 left-2 flex flex-wrap gap-1.5"');
    expect(card).toContain('className="absolute bottom-2 right-2 rounded-full');
    expect(card).toContain('"max-w-[calc(100%-5rem)]"');
    expect(card).toContain("-{discountPercentage}%");
    expect(card).toContain("calculateDiscountPercentage(");
  });
});
