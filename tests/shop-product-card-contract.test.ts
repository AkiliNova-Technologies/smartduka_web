import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { serializeMarketplaceProduct } from "@/services/product";

const source = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

const shopProduct = (variants: Array<{ isActive: boolean; inventoryCount: number; price: number }>) =>
  serializeMarketplaceProduct({
    id: "product-1",
    name: "Shirt",
    slug: "shirt",
    brand: null,
    basePrice: 100,
    compareAtPrice: null,
    inventoryCount: 0,
    vendorId: "shop-1",
    vendor: { storeName: "Shop" },
    images: [],
    reviews: [],
    variants,
  });

describe("shop storefront product cards", () => {
  it("uses the canonical marketplace serializer with persisted variants and reviews", () => {
    const shopService = source("src/services/vendor.ts");

    expect(shopService).toContain("getPublicShopBySlug");
    expect(shopService).toContain("serializeMarketplaceProduct");
    expect(shopService).toContain("variants: { select: { isActive: true, inventoryCount: true, price: true } }");
    expect(shopService).toContain('reviews: { where: { status: "PUBLISHED" }');
  });

  it("keeps a variant product selectable when parent inventory is zero", () => {
    expect(shopProduct([{ isActive: true, inventoryCount: 3, price: 120 }])).toMatchObject({
      inventoryCount: 3,
      isPurchasable: true,
      requiresVariantSelection: true,
    });
  });

  it("keeps exhausted variant products out of stock", () => {
    expect(shopProduct([{ isActive: true, inventoryCount: 0, price: 120 }])).toMatchObject({
      inventoryCount: 0,
      isPurchasable: false,
      requiresVariantSelection: true,
    });
  });

  it("uses the same card flow for simple and variant products without preselecting a variant", () => {
    const card = source("src/components/marketplace/product-card.tsx");

    expect(card).toContain("product.requiresVariantSelection");
    expect(card).toContain("Choose Options");
    expect(card).toContain("Add to Cart");
    expect(card).toContain("setSelectedOptions({});");
    expect(card).toContain("disabled={!isOptionAvailable(name, value)}");
    expect(card).toContain("variantId: selectedVariant.id");
    expect(card).toContain("quantity: 1");
  });
});
