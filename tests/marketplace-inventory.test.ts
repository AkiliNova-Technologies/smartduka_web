import { describe, expect, it } from "vitest";
import { serializeMarketplaceProduct } from "@/services/product";
import { validateVariants } from "@/lib/variant-validation";

const product = (variants: Array<{ isActive: boolean; inventoryCount: number; price: number }>, inventoryCount = 0) =>
  serializeMarketplaceProduct({
    id: "product-1", name: "Tee", slug: "tee", brand: null, basePrice: 100,
    compareAtPrice: null, inventoryCount, vendorId: "vendor-1",
    vendor: { storeName: "Shop" }, images: [], variants,
  });

describe("marketplace inventory projection", () => {
  it("uses product stock for simple products", () => {
    expect(product([], 4)).toMatchObject({ inventoryCount: 4, isPurchasable: true, requiresVariantSelection: false });
    expect(product([], 0)).toMatchObject({ inventoryCount: 0, isPurchasable: false });
  });

  it("sums only active, in-stock variant combinations", () => {
    const variants = Array.from({ length: 8 }, () => ({ isActive: true, inventoryCount: 5, price: 100 }));
    expect(product(variants, 999)).toMatchObject({ inventoryCount: 40, isPurchasable: true, requiresVariantSelection: true });
  });

  it("does not fall back to parent stock for disabled or exhausted variants", () => {
    expect(product([{ isActive: false, inventoryCount: 9, price: 100 }], 9)).toMatchObject({ inventoryCount: 0, isPurchasable: false });
    expect(product([{ isActive: true, inventoryCount: 0, price: 100 }], 9)).toMatchObject({ inventoryCount: 0, isPurchasable: false });
  });

  it("accepts the Classic Men's Oxford Shirt's 12 SKU-less combinations and derives 60 units", () => {
    const variants = validateVariants(
      ["S", "M", "L", "XL"].flatMap((size) =>
        ["White", "Blue", "Pink"].map((colour) => ({
          name: `${size} / ${colour}`,
          price: 65000,
          inventoryCount: 5,
          options: { Size: size, Colour: colour },
          isActive: true,
        })),
      ),
    );
    expect(variants).toHaveLength(12);
    expect(variants.every((variant) => variant.sku === undefined)).toBe(true);
    expect(product(variants, 0)).toMatchObject({ inventoryCount: 60, isPurchasable: true });
  });
});
