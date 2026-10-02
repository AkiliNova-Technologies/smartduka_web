import { describe, expect, it } from "vitest";
import { optionKey, validateVariants } from "@/lib/variant-validation";

describe("variant domain validation", () => {
  it("canonicalizes option keys and rejects duplicate combinations", () => {
    expect(optionKey({ Colour: "Black", Size: "M" })).toBe("colour=black|size=m");
    expect(() => validateVariants([
      { sku: "shirt-m-black", name: "M / Black", price: 10, inventoryCount: 1, options: { Size: "M", Colour: "Black" } },
      { sku: "shirt-black-m", name: "Black / M", price: 10, inventoryCount: 1, options: { Colour: "black", Size: "m" } },
    ])).toThrow("Duplicate variant option combination");
  });
});
