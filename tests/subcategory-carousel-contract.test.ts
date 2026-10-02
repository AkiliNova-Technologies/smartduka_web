import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/marketplace/subcategory-carousel.tsx"), "utf8");

describe("subcategory carousel", () => {
  it("uses native horizontal scrolling with accessible conditional controls", () => {
    expect(source).toContain("scrollBy");
    expect(source).toContain("snap-x");
    expect(source).toContain("Show previous subcategories");
    expect(source).toContain("Show more subcategories");
    expect(source).toContain("canScrollForward");
  });
});
