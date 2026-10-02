import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
describe("UI-11A canonical category card", () => {
  it("uses uploaded imagery with one local fallback, accessible routing, and restrained image treatment", () => {
    const card = source("src/components/marketplace/category-card.tsx");
    expect(card).toContain("category.image");
    expect(card).toContain('fallback="/placeholders/category-image.svg"');
    expect(card).toContain('href={`/categories/${category.slug}`}');
    expect(card).toContain("aspect-[4/3]");
    expect(card).toContain("line-clamp-2");
    expect(card).toContain("motion-reduce");
  });
  it("consolidates customer category discovery onto the shared card", () => {
    for (const path of ["src/components/pages/CategoryDetailView.tsx", "src/components/home/HomeDiscovery.tsx", "src/components/home/CategoryBento.tsx"]) expect(source(path)).toContain("CategoryCard");
    expect(source("src/app/(customer)/categories/[slug]/CategoryDetailContent.tsx")).toContain("SubcategoryCarousel");
    expect(source("src/components/pages/CategoryDetailView.tsx")).not.toContain("Grid2X2");
    expect(source("src/components/home/CategoryBento.tsx")).not.toContain("unsplash");
  });
  it("ships a local neutral category fallback", () => expect(source("public/placeholders/category-image.svg")).toContain("<svg"));
});
