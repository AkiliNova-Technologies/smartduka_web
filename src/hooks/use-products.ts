"use client";

import React, { useContext } from "react";
import { VendorCatalogContext } from "@/providers/VendorCatalogProvider";
import { PublicCatalogContext } from "@/providers/PublicCatalogProvider";
import type { Product } from "@/types/marketplace";

interface UseProductsOptions {
  vendorId?: string;
  categoryId?: string;
  status?: string;
  search?: string;
  limit?: number;
}

export function useProducts(options: UseProductsOptions = {}) {
  const vendorCatalog = useContext(VendorCatalogContext);
  const publicCatalog = useContext(PublicCatalogContext);

  const catalog = vendorCatalog ?? publicCatalog;

  if (!catalog) {
    throw new Error(
      "useProducts must be used within a PublicCatalogProvider or VendorCatalogProvider."
    );
  }

  const filteredProducts = React.useMemo(() => {
    let result = catalog.products as Product[];
    if (options.vendorId) result = result.filter((p) => p.vendorId === options.vendorId);
    if (options.categoryId) result = result.filter((p) => p.categoryId === options.categoryId);
    if (options.status) result = result.filter((p) => p.status === options.status);
    if (options.search) {
      const s = options.search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(s) || (p.brand || "").toLowerCase().includes(s)
      );
    }
    if (options.limit) result = result.slice(0, options.limit);
    return result;
  }, [catalog.products, options.vendorId, options.categoryId, options.status, options.search, options.limit]);

  return {
    products: filteredProducts,
    isLoading: catalog.productsLoading,
    isMutating: vendorCatalog?.isMutating ?? false,
    error: catalog.error,
    refresh: catalog.refreshProducts,
    createProduct: vendorCatalog?.createProduct,
    updateProduct: vendorCatalog?.updateProduct,
    deleteProduct: vendorCatalog?.deleteProduct,
    fetchProductById: vendorCatalog?.fetchProductById,
  };
}