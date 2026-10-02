import { describe, expect, it } from "vitest";
import { validateProductStep } from "@/lib/product-form-validation";

describe("vendor product form validation", () => {
  it("returns field-specific basic information errors", () => {
    expect(validateProductStep(1, { title: "", price: "-1", categoryId: "", inventoryCount: "-2" })).toEqual({
      title: "Product title is required.",
      price: "Enter a valid selling price.",
      categoryId: "Select a category.",
      inventoryCount: "Stock quantity must be zero or greater.",
    });
  });

  it("requires a primary image only on the media step", () => {
    expect(validateProductStep(2, { image: "" })).toEqual({ image: "Upload a primary product image." });
    expect(validateProductStep(2, { image: "https://example.com/dress.jpg" })).toEqual({});
  });
});
