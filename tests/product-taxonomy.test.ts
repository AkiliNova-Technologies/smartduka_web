import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveTaxonomySelection,
  taxonomyPublishError,
} from "@/lib/product-taxonomy";
import type { CategoryTree } from "@/types/marketplace";

const node = (id: string, children: CategoryTree[] = [], active = true): CategoryTree => ({
  id,
  name: id,
  slug: id.toLowerCase(),
  description: "",
  image: "",
  parentId: null,
  isActive: active,
  children,
  subCategories: children,
});
const taxonomy = [
  node("Fashion", [node("Clothing", [node("Dresses"), node("Tops")])]),
  node("Shoes", [node("Sneakers"), node("Inactive", [], false)]),
];
const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("product taxonomy selection", () => {
  it("resolves and requires the terminal node of a three-level path", () => {
    const partial = resolveTaxonomySelection(taxonomy, { categoryId: "Fashion", subCategoryId: "Clothing" });
    expect(partial.productTypes.map((item) => item.id)).toEqual(["Dresses", "Tops"]);
    expect(taxonomyPublishError(taxonomy, { categoryId: "Fashion", subCategoryId: "Clothing" })).toBe("Select a product type.");
    expect(taxonomyPublishError(taxonomy, { categoryId: "Fashion", subCategoryId: "Dresses" })).toBeUndefined();
  });

  it("accepts a direct child for a two-level path and excludes inactive nodes", () => {
    const resolved = resolveTaxonomySelection(taxonomy, { categoryId: "Shoes", subCategoryId: "Sneakers" });
    expect(resolved.subcategories.map((item) => item.id)).toEqual(["Sneakers"]);
    expect(resolved.terminal?.id).toBe("Sneakers");
    expect(taxonomyPublishError(taxonomy, { categoryId: "Shoes", subCategoryId: "Inactive" })).toBe("Select a subcategory.");
  });

  it("keeps taxonomy in drafts and refresh recovery while publish validation remains terminal", () => {
    const create = source("src/app/(vendor)/vendor/products/new/page.tsx");
    const edit = source("src/app/(vendor)/vendor/products/[id]/edit/page.tsx");
    const recovery = source("src/hooks/use-product-form-recovery.ts");
    expect(create).toContain("subCategoryId: formData.subCategoryId || undefined");
    expect(create).toContain('status: "DRAFT"');
    expect(edit).toContain("setFormData(saved.value.formData)");
    expect(recovery).toContain("JSON.stringify(envelope)");
    expect(create).toContain("taxonomyPublishError");
    expect(edit).toContain("taxonomyPublishError");
  });

  it("uses searchable subcategory and product-type comboboxes and resets descendants", () => {
    const selector = source("src/components/vendor/ProductTaxonomySelector.tsx");
    expect(selector).toContain('searchPlaceholder="Search subcategories..."');
    expect(selector).toContain('searchPlaceholder="Search product types..."');
    expect(selector).toContain('onChange({ categoryId: next, subCategoryId: "" })');
    expect(selector).toContain("onChange({ categoryId, subCategoryId: next })");
  });

  it("validates active ancestry server-side and retains descendant marketplace discovery", () => {
    const category = source("src/services/category.ts");
    const product = source("src/services/product.ts");
    expect(category).toContain("Every taxonomy level in the selected path must be active.");
    expect(category).toContain("hasActiveChildren");
    expect(product).toContain('requireTerminal: input.status === "PUBLISHED"');
    expect(product).toContain("flatten(selected.children)");
    expect(product).toContain("subCategoryId: { in: ids }");
  });
});
