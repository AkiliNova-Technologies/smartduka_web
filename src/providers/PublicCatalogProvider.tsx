"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { fetchApi } from "@/lib/providers/useProviderFetch";
import type { Product, CategoryTree } from "@/types/marketplace";

// ==========================================
// TYPES
// ==========================================

interface PublicCatalogContextType {
  categories: CategoryTree[];
  categoriesLoading: boolean;
  products: Product[];
  productsLoading: boolean;
  error: string | null;
  refreshProducts: () => void;
  refreshCategories: () => void;
}

// ==========================================
// MODULE-LEVEL CACHE
// ==========================================

// Shared across all customer sessions within the same JS context
let cachedCategories: CategoryTree[] | null = null;
let cachedProducts: Product[] | null = null;
let categoriesPromise: Promise<CategoryTree[]> | null = null;
let productsPromise: Promise<Product[]> | null = null;

// ==========================================
// CONTEXT
// ==========================================

export const PublicCatalogContext = createContext<PublicCatalogContextType | undefined>(undefined);

// ==========================================
// PROVIDER
// ==========================================

export function PublicCatalogProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<CategoryTree[]>(cachedCategories || []);
  const [products, setProducts] = useState<Product[]>(cachedProducts || []);
  const [categoriesLoading, setCategoriesLoading] = useState(!cachedCategories);
  const [productsLoading, setProductsLoading] = useState(!cachedProducts);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // FETCH CATEGORIES
  // ==========================================

  const fetchCategories = useCallback(async (): Promise<CategoryTree[]> => {
    // Return cached data immediately if available
    if (cachedCategories) {
      setCategories(cachedCategories);
      setCategoriesLoading(false);
      return cachedCategories;
    }

    // Deduplicate concurrent requests
    if (categoriesPromise) {
      const result = await categoriesPromise;
      setCategories(result);
      setCategoriesLoading(false);
      return result;
    }

    setCategoriesLoading(true);

    categoriesPromise = (async () => {
      try {
        const data = await fetchApi<CategoryTree[]>("/api/categories?mode=tree");
        cachedCategories = data;
        return data;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load categories";
        setError(message);
        return [];
      } finally {
        categoriesPromise = null;
      }
    })();

    const result = await categoriesPromise;
    setCategories(result);
    setCategoriesLoading(false);
    return result;
  }, []);

  // ==========================================
  // FETCH PRODUCTS
  // ==========================================

  const fetchProducts = useCallback(async (): Promise<Product[]> => {
    if (cachedProducts) {
      setProducts(cachedProducts);
      setProductsLoading(false);
      return cachedProducts;
    }

    if (productsPromise) {
      const result = await productsPromise;
      setProducts(result);
      setProductsLoading(false);
      return result;
    }

    setProductsLoading(true);

    productsPromise = (async () => {
      try {
        const data = await fetchApi<Product[]>("/api/products");
        cachedProducts = data;
        return data;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load products";
        setError(message);
        return [];
      } finally {
        productsPromise = null;
      }
    })();

    const result = await productsPromise;
    setProducts(result);
    setProductsLoading(false);
    return result;
  }, []);

  // ==========================================
  // REFRESH
  // ==========================================

  const refreshCategories = useCallback(() => {
    cachedCategories = null;
    categoriesPromise = null;
    fetchCategories();
  }, [fetchCategories]);

  const refreshProducts = useCallback(() => {
    cachedProducts = null;
    productsPromise = null;
    fetchProducts();
  }, [fetchProducts]);

  // ==========================================
  // INITIAL FETCH
  // ==========================================

  useEffect(() => {
    queueMicrotask(() => {
      fetchCategories();
      fetchProducts();
    });
  }, [fetchCategories, fetchProducts]);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <PublicCatalogContext.Provider
      value={{
        categories,
        categoriesLoading,
        products,
        productsLoading,
        error,
        refreshProducts,
        refreshCategories,
      }}
    >
      {children}
    </PublicCatalogContext.Provider>
  );
}

// ==========================================
// HOOK
// ==========================================

export function usePublicCatalog() {
  const context = useContext(PublicCatalogContext);
  if (context === undefined) {
    throw new Error("usePublicCatalog must be used within a PublicCatalogProvider");
  }
  return context;
}