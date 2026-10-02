import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("marketplace wishlist styling", () => {
  it("uses the shared green primary token for active and hover states", () => {
    const card = source("src/components/marketplace/product-card.tsx");
    const detail = source("src/app/(customer)/products/[slug]/ProductDetailContent.tsx");
    for (const value of [card, detail]) {
      expect(value).toContain("hover:border-primary");
      expect(value).toContain("hover:text-primary");
      expect(value).toContain("border-primary bg-primary/10 text-primary");
    }
    expect(card).not.toContain("border-rose-200 bg-rose-50 text-rose-600");
  });
});
