import { describe, expect, it } from "vitest";
import {
  getRelatedCategoryScopes,
  selectRelatedCandidates,
} from "@/services/product";

describe("related product category discovery", () => {
  const categories = [
    { id: "root", parentId: null },
    { id: "shirts", parentId: "root" },
    { id: "oxfords", parentId: "shirts" },
    { id: "tees", parentId: "shirts" },
  ];

  it("prioritizes the deepest assigned category and supports three levels", () => {
    expect(getRelatedCategoryScopes(["root", "oxfords"], categories)).toEqual({
      leafCategoryId: "oxfords",
      siblingIds: ["tees"],
      mainCategoryIds: ["oxfords", "root", "shirts", "tees"],
    });
  });

  it("uses immediate siblings before the main-category fallback", () => {
    const results = selectRelatedCandidates(
      [
        [{ id: "leaf", inventoryCount: 2, isPurchasable: true }],
        [{ id: "sibling", inventoryCount: 1, isPurchasable: true }],
        [{ id: "main", inventoryCount: 4, isPurchasable: true }],
      ],
      3,
    );
    expect(results.map((product) => product.id)).toEqual(["leaf", "sibling", "main"]);
  });

  it("removes duplicates, excludes unavailable products until needed, and keeps stable order", () => {
    const results = selectRelatedCandidates(
      [
        [
          { id: "sold-out", inventoryCount: 0, isPurchasable: false },
          { id: "available", inventoryCount: 3, isPurchasable: true },
        ],
        [
          { id: "available", inventoryCount: 3, isPurchasable: true },
          { id: "fallback", inventoryCount: 1, isPurchasable: true },
        ],
      ],
      3,
    );
    expect(results.map((product) => product.id)).toEqual(["available", "sold-out", "fallback"]);
  });
});
