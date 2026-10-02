import { describe, expect, it } from "vitest";
import {
  buildGenerationPlan,
  validateOptionGroups,
  type EditableProductVariant,
} from "@/components/vendor/ProductVariantEditor";

const dressGroups = [
  { id: "size", name: "Size", values: ["Small", "Medium", "Large"] },
  { id: "colour", name: "Colour", values: ["Black", "Red"] },
];

describe("ProductVariantEditor planning", () => {
  it("creates the six dress combinations with starting values", () => {
    const plan = buildGenerationPlan(dressGroups, [], {
      price: 180000,
      stock: 10,
    });
    expect(plan.generated).toHaveLength(6);
    expect(plan.generated[0]).toMatchObject({
      name: "Small / Black",
      price: 180000,
      inventoryCount: 10,
    });
  });

  it("preserves matching IDs and previews retirement without mutating input", () => {
    const existing: EditableProductVariant[] = [
      { id: "small-black", sku: "DRESS-1", name: "Small / Black", price: 100, inventoryCount: 2, options: { Size: "Small", Colour: "Black" }, isActive: true },
      { id: "small-red", sku: "DRESS-2", name: "Small / Red", price: 120, inventoryCount: 3, options: { Size: "Small", Colour: "Red" }, isActive: true },
    ];
    const plan = buildGenerationPlan([
      { id: "size", name: "Size", values: ["Small"] },
      { id: "colour", name: "Colour", values: ["Black"] },
    ], existing, { price: 180000, stock: 10 });
    expect(plan.retained[0].id).toBe("small-black");
    expect(plan.retired).toEqual([{ ...existing[1], isActive: false }]);
    expect(existing[1].isActive).toBe(true);
  });

  it("rejects incomplete and duplicate option groups before generation", () => {
    expect(validateOptionGroups([{ id: "a", name: "Size", values: [] }]).size).toBe(1);
    expect(validateOptionGroups([
      { id: "a", name: "Size", values: ["Small"] },
      { id: "b", name: "size", values: ["Small", "small"] },
    ]).size).toBe(1);
  });
});
