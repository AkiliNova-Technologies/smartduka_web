"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  getProductAction,
} from "@/actions/product";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "@/actions/category";
import type { Product, CategoryTree } from "@/types/marketplace";

// ─── Input types ───

interface CreateProductHookInput {
  vendorId: string;
  name: string;
  slug: string;
  brand?: string;
  description?: string;
  basePrice: number;
  compareAtPrice?: number;
  categoryId?: string;
  subCategoryId?: string;
  inventoryCount?: number;
  sku?: string;
  sizes?: string[];
  colors?: string[];
  specs?: Record<string, string>[];
  status?: string;
  tags?: string[];
  images?: { url: string; isFeatured?: boolean; sortOrder?: number }[];
}

interface UpdateProductHookInput {
  name?: string;
  slug?: string;
  brand?: string;
  description?: string;
  basePrice?: number;
  compareAtPrice?: number | null;
  categoryId?: string | null;
  subCategoryId?: string | null;
  inventoryCount?: number;
  sku?: string;
  status?: "DRAFT" | "PUBLISHED" | "ACTIVE" | "ARCHIVED" | "OUT_OF_STOCK";
  sizes?: string[];
  colors?: string[];
  specs?: Record<string, string>[];
  tags?: string[];
}

interface CatalogDataContextType {
  categories: CategoryTree[];
  categoriesLoading: boolean;
  createCategory: (input: {
    name: string;
    slug: string;
    description: string;
    image: string;
    subCategories: { name: string; slug: string; image: string }[];
  }) => Promise<{ success: boolean; error?: string }>;
  updateCategory: (input: {
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    parentId?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshCategories: () => Promise<void>;
  products: Product[];
  productsLoading: boolean;
  isMutating: boolean;
  error: string | null;
  createProduct: (input: CreateProductHookInput) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  updateProduct: (id: string, input: UpdateProductHookInput) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  fetchProductById: (id: string) => Promise<Product>;
  refreshProducts: () => Promise<void>;
}

const CatalogDataContext = createContext<CatalogDataContextType | undefined>(undefined);

export function CatalogDataProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Categories ───

  // Lazy initializer — fetch on first access, not in an effect
  const categoriesFetched = useRef(false);
  const categoriesPromise = useRef<Promise<void> | null>(null);

  const fetchCategories = useCallback(async () => {
    if (categoriesFetched.current) return;
    
    // Prevent concurrent fetches
    if (categoriesPromise.current) return categoriesPromise.current;

    categoriesPromise.current = (async () => {
      setCategoriesLoading(true);
      try {
        const res = await fetch("/api/categories?mode=tree", {
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCategories(data.data || data.categories || []);
      } catch {
        // silent for categories — not critical
      } finally {
        setCategoriesLoading(false);
        categoriesFetched.current = true;
        categoriesPromise.current = null;
      }
    })();

    return categoriesPromise.current;
  }, []);

  const refreshCategories = useCallback(async () => {
    categoriesFetched.current = false;
    categoriesPromise.current = null;
    await fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (input: {
    name: string;
    slug: string;
    description: string;
    image: string;
    subCategories: { name: string; slug: string; image: string }[];
  }) => {
    setIsMutating(true);
    try {
      const result = await createCategoryAction(input);
      if (!result.success) throw new Error(result.error);
      await refreshCategories();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create category";
      return { success: false, error: message };
    } finally {
      setIsMutating(false);
    }
  };

  const updateCategory = async (input: {
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    parentId?: string | null;
  }) => {
    setIsMutating(true);
    try {
      const result = await updateCategoryAction(input);
      if (!result.success) throw new Error(result.error);
      await refreshCategories();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update category";
      return { success: false, error: message };
    } finally {
      setIsMutating(false);
    }
  };

  const deleteCategory = async (id: string) => {
    setIsMutating(true);
    try {
      const result = await deleteCategoryAction(id);
      if (!result.success) throw new Error(result.error);
      await refreshCategories();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete category";
      return { success: false, error: message };
    } finally {
      setIsMutating(false);
    }
  };

  // ─── Products ───

  const productsFetched = useRef(false);
  const productsPromise = useRef<Promise<void> | null>(null);

  const fetchProducts = useCallback(async () => {
    if (productsFetched.current) return;
    if (productsPromise.current) return productsPromise.current;

    productsPromise.current = (async () => {
      setProductsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/products", {
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          setProducts(data.data);
        } else {
          throw new Error(data.error || "Failed to fetch products");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load products";
        setError(message);
      } finally {
        setProductsLoading(false);
        productsFetched.current = true;
        productsPromise.current = null;
      }
    })();

    return productsPromise.current;
  }, []);

  const refreshProducts = useCallback(async () => {
    productsFetched.current = false;
    productsPromise.current = null;
    await fetchProducts();
  }, [fetchProducts]);

  const fetchProductById = async (id: string): Promise<Product> => {
    const result = await getProductAction(id);
    if (!result.success) throw new Error(result.error || "Product not found");
    return result.data as Product;
  };

  const createProduct = async (input: CreateProductHookInput) => {
    setIsMutating(true);
    try {
      const result = await createProductAction(input as Parameters<typeof createProductAction>[0]);
      if (!result.success) throw new Error(result.error);
      await refreshProducts();
      return { success: true, data: result.data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create product";
      return { success: false, error: message };
    } finally {
      setIsMutating(false);
    }
  };

  const updateProduct = async (id: string, input: UpdateProductHookInput) => {
    setIsMutating(true);
    try {
      const result = await updateProductAction({ id, ...input });
      if (!result.success) throw new Error(result.error);
      await refreshProducts();
      return { success: true, data: result.data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update product";
      return { success: false, error: message };
    } finally {
      setIsMutating(false);
    }
  };

  const deleteProduct = async (id: string) => {
    setIsMutating(true);
    try {
      const result = await deleteProductAction(id);
      if (!result.success) throw new Error(result.error);
      await refreshProducts();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete product";
      return { success: false, error: message };
    } finally {
      setIsMutating(false);
    }
  };

  // ─── Initialization: trigger fetch safely after mount ───

  React.useEffect(() => {
    // Defer to the microtask queue to avoid synchronous state updates
    // (like setCategoriesLoading(true)) triggering cascading renders warnings.
    queueMicrotask(() => {
      fetchCategories();
      fetchProducts();
    });
  }, [fetchCategories, fetchProducts]);

  return (
    <CatalogDataContext.Provider
      value={{
        categories,
        categoriesLoading,
        createCategory,
        updateCategory,
        deleteCategory,
        refreshCategories,
        products,
        productsLoading,
        isMutating,
        error,
        createProduct,
        updateProduct,
        deleteProduct,
        fetchProductById,
        refreshProducts,
      }}
    >
      {children}
    </CatalogDataContext.Provider>
  );
}

export function useCatalogData() {
  const context = useContext(CatalogDataContext);
  if (context === undefined) {
    throw new Error("useCatalogData must be used within a CatalogDataProvider");
  }
  return context;
}