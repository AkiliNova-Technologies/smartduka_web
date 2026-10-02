import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { serializeMarketplaceProduct } from "@/services/product";

const product = (category: object | null, subCategory: object | null) =>
  serializeMarketplaceProduct({
    id: "product-1", name: "Shirt", slug: "shirt", brand: null, basePrice: 100,
    compareAtPrice: null, inventoryCount: 3, vendorId: "vendor-1",
    vendor: { storeName: "Shop" }, images: [], reviews: [], variants: [], category, subCategory,
  });

describe("marketplace category hierarchy projection", () => {
  it("uses root category when no more-specific assignment exists", () => {
    expect(product({ id: "fashion", name: "Fashion & Apparel", slug: "fashion" }, null)).toMatchObject({ categoryName: "Fashion & Apparel", subCategoryName: null });
  });

  it("uses the assigned subcategory and preserves its path", () => {
    const root = { id: "fashion", name: "Fashion & Apparel", slug: "fashion" };
    const sub = { id: "shirts", name: "Shirts & Tops", slug: "shirts", parent: root };
    expect(product(root, sub)).toMatchObject({ categoryName: "Fashion & Apparel", subCategoryName: "Shirts & Tops", categoryPath: [root, sub] });
  });

  it("uses the deepest assigned category across three levels", () => {
    const root = { id: "fashion", name: "Fashion & Apparel", slug: "fashion" };
    const middle = { id: "shirts", name: "Shirts & Tops", slug: "shirts", parent: root };
    const leaf = { id: "formal", name: "Formal Shirts", slug: "formal", parent: middle };
    expect(product(root, leaf)).toMatchObject({ subCategoryName: "Formal Shirts", mostSpecificCategory: leaf, categoryPath: [root, middle, leaf] });
  });

  it("uses the hierarchy select in catalogue, new-arrival, deal, related, and category paths", () => {
    const productService = fs.readFileSync(path.join(process.cwd(), "src/services/product.ts"), "utf8");
    const categoryService = fs.readFileSync(path.join(process.cwd(), "src/services/category.ts"), "utf8");
    expect(productService.match(/subCategory: \{ select: marketplaceCategorySelect \}/g)?.length).toBeGreaterThanOrEqual(4);
    expect(categoryService).toContain("subCategory: { select: categorySelect }");
  });
});
