import type { CategoryTree } from "@/types/marketplace";

export type ProductTaxonomySelection = {
  categoryId: string;
  subCategoryId: string;
};

const childrenOf = (node?: CategoryTree) =>
  (node?.children ?? node?.subCategories ?? []).filter(
    (child) => child.isActive !== false,
  );

export function activeTaxonomyRoots(categories: CategoryTree[]) {
  return categories.filter((category) => category.isActive !== false);
}

export function resolveTaxonomySelection(
  categories: CategoryTree[],
  selection: ProductTaxonomySelection,
) {
  const category = activeTaxonomyRoots(categories).find(
    (item) => item.id === selection.categoryId,
  );
  const subcategories = childrenOf(category);
  const directSelection = subcategories.find(
    (item) => item.id === selection.subCategoryId,
  );
  const containingSubcategory = subcategories.find((item) =>
    childrenOf(item).some((child) => child.id === selection.subCategoryId),
  );
  const subcategory = containingSubcategory ?? directSelection;
  const productTypes = childrenOf(subcategory);
  const productType = productTypes.find(
    (item) => item.id === selection.subCategoryId,
  );
  const terminal = productType ??
    (directSelection && childrenOf(directSelection).length === 0
      ? directSelection
      : undefined);

  return { category, subcategories, subcategory, productTypes, productType, terminal };
}

export function taxonomyPublishError(
  categories: CategoryTree[],
  selection: ProductTaxonomySelection,
) {
  const resolved = resolveTaxonomySelection(categories, selection);
  if (!resolved.category) return "Select an active category.";
  if (resolved.subcategories.length && !resolved.subcategory)
    return "Select a subcategory.";
  if (resolved.productTypes.length && !resolved.productType)
    return "Select a product type.";
  if (!resolved.terminal && resolved.subcategories.length)
    return "Select the final product taxonomy level.";
  return undefined;
}
