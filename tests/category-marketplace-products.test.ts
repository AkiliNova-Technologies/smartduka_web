import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { serializeMarketplaceProduct } from "@/services/product";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/services/category.ts"),
  "utf8",
);

const categoryProduct = (
  variants: Array<{ isActive: boolean; inventoryCount: number; price: number }>,
  inventoryCount = 0,
) =>
  serializeMarketplaceProduct({
    id: "category-product",
    name: "Category product",
    slug: "category-product",
    brand: null,
    basePrice: 100,
    compareAtPrice: null,
    inventoryCount,
    vendorId: "vendor-1",
    vendor: { storeName: "Shop" },
    images: [],
    reviews: [],
    variants,
  });

describe("category marketplace product projection", () => {
  it("uses the shared marketplace serializer in one bounded category query", () => {
    expect(source).toContain("serializeMarketplaceProduct(product as unknown as Record<string, unknown>)");
    expect(source).toContain("variants: { select: { isActive: true, inventoryCount: true, price: true } }");
    expect(source).toContain('reviews: { where: { status: "PUBLISHED" }');
    expect(source).toContain("take: options?.limit || 50");
  });

  it("uses product inventory for simple products", () => {
    expect(categoryProduct([], 4)).toMatchObject({ inventoryCount: 4, isPurchasable: true, requiresVariantSelection: false });
    expect(categoryProduct([], 0)).toMatchObject({ inventoryCount: 0, isPurchasable: false });
  });

  it("derives category availability and price mode from eligible variants", () => {
    expect(categoryProduct([
      { isActive: true, inventoryCount: 5, price: 100 },
      { isActive: true, inventoryCount: 5, price: 120 },
      { isActive: true, inventoryCount: 0, price: 130 },
      { isActive: false, inventoryCount: 9, price: 140 },
    ])).toMatchObject({ inventoryCount: 10, isPurchasable: true, requiresVariantSelection: true, priceFrom: true });
  });

  it("keeps fully exhausted variant products out of stock", () => {
    expect(categoryProduct([{ isActive: true, inventoryCount: 0, price: 100 }], 99)).toMatchObject({ inventoryCount: 0, isPurchasable: false, requiresVariantSelection: true });
  });
});
