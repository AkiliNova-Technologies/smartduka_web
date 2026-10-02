import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const card = readFileSync(resolve(process.cwd(), "src/components/marketplace/product-card.tsx"), "utf8");

describe("marketplace product card actions", () => {
  it("uses the direct cart action for simple products and quick add for variants", () => {
    expect(card).toContain("<ShoppingCart className=\"size-4\" /> Add to Cart");
    expect(card).toContain("<SlidersHorizontal className=\"size-4\" /> Choose Options");
    expect(card).toContain("getPublicProductAction(product.slug)");
  });

  it("shows a disabled out-of-stock action instead of navigation", () => {
    expect(card).toContain("Out of Stock");
    expect(card).toContain("disabled aria-label={`${product.name} is out of stock`}");
  });
});
