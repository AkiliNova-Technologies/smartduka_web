"use client";

import { useContext } from "react";
import { VendorCatalogContext } from "@/providers/VendorCatalogProvider";
import { PublicCatalogContext } from "@/providers/PublicCatalogProvider";

export function useCategories() {
  const vendorCatalog = useContext(VendorCatalogContext);
  const publicCatalog = useContext(PublicCatalogContext);

  const catalog = vendorCatalog ?? publicCatalog;

  if (!catalog) {
    throw new Error(
      "useCategories must be used within a PublicCatalogProvider or VendorCatalogProvider."
    );
  }

  return {
    categories: catalog.categories,
    isLoading: catalog.categoriesLoading,
    isMutating: vendorCatalog?.isMutating ?? false,
    error: catalog.error,
    refresh: catalog.refreshCategories,
    createCategory: vendorCatalog?.createCategory,
    updateCategory: vendorCatalog?.updateCategory,
    deleteCategory: vendorCatalog?.deleteCategory,
  };
}