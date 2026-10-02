import { describe, expect, it } from "vitest";
import { generateVariantSku } from "@/lib/variant-sku";
import { validateVariants } from "@/lib/variant-validation";

describe("automatic variant SKUs", () => {
  it("creates readable collision-resistant SKU candidates", () => {
    const first = generateVariantSku("12345678-1234-1234-1234-123456789012");
    const second = generateVariantSku("12345678-1234-1234-1234-123456789012");
    expect(first).toMatch(/^VAR-12345678-[A-F0-9]{10}$/);
    expect(second).not.toBe(first);
  });

  it("accepts a new variant without a SKU while preserving explicit legacy SKUs", () => {
    const variants = validateVariants([
      { name: "Small / Black", price: 100, inventoryCount: 1, options: { Size: "Small", Colour: "Black" } },
      { sku: "LEGACY-RED", name: "Small / Red", price: 100, inventoryCount: 1, options: { Size: "Small", Colour: "Red" } },
    ]);
    expect(variants[0].sku).toBeUndefined();
    expect(variants[1].sku).toBe("LEGACY-RED");
  });
});
