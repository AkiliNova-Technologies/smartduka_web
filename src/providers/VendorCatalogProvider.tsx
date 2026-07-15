"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
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
import { fetchApi } from "@/lib/providers/useProviderFetch";
import type { Product, CategoryTree } from "@/types/marketplace";

// ==========================================
// TYPES
// ==========================================

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

interface VendorCatalogContextType {
  // Categories
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
  refreshCategories: () => void;

  // Products
  products: Product[];
  productsLoading: boolean;
  isMutating: boolean;
  error: string | null;
  createProduct: (input: CreateProductHookInput) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  updateProduct: (id: string, input: UpdateProductHookInput) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  fetchProductById: (id: string) => Promise<Product>;
  refreshProducts: () => void;
}

// ==========================================
// HELPERS
// ==========================================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}

// ==========================================
// CONTEXT
// ==========================================

export const VendorCatalogContext = createContext<VendorCatalogContextType | undefined>(undefined);

// ==========================================
// PROVIDER
// ==========================================

export function VendorCatalogProvider({
  children,
  vendorId,
}: {
  children: React.ReactNode;
  vendorId?: string; // ✅ Optional — when absent, fetches ALL products (admin mode)
}) {
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // FETCH CATEGORIES
  // ==========================================

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const data = await fetchApi<CategoryTree[]>("/api/categories?mode=tree");
      setCategories(data);
    } catch {
      // Categories are non-critical — silent failure
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const refreshCategories = useCallback(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ==========================================
  // CATEGORY MUTATIONS
  // ==========================================

  const createCategory = useCallback(
    async (input: {
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
        await fetchCategories();
        return { success: true as const };
      } catch (err: unknown) {
        return { success: false as const, error: getErrorMessage(err) };
      } finally {
        setIsMutating(false);
      }
    },
    [fetchCategories]
  );

  const updateCategory = useCallback(
    async (input: {
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
        await fetchCategories();
        return { success: true as const };
      } catch (err: unknown) {
        return { success: false as const, error: getErrorMessage(err) };
      } finally {
        setIsMutating(false);
      }
    },
    [fetchCategories]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      setIsMutating(true);
      try {
        const result = await deleteCategoryAction(id);
        if (!result.success) throw new Error(result.error);
        await fetchCategories();
        return { success: true as const };
      } catch (err: unknown) {
        return { success: false as const, error: getErrorMessage(err) };
      } finally {
        setIsMutating(false);
      }
    },
    [fetchCategories]
  );

  // ==========================================
  // FETCH PRODUCTS
  // ==========================================

  const buildProductsUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (vendorId) params.set("vendorId", vendorId);
    const queryString = params.toString();
    return `/api/products${queryString ? `?${queryString}` : ""}`;
  }, [vendorId]);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    setError(null);
    try {
      const url = buildProductsUrl();
      const data = await fetchApi<Product[]>(url);
      setProducts(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setProductsLoading(false);
    }
  }, [buildProductsUrl]);

  const refreshProducts = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ==========================================
  // PRODUCT FETCH BY ID
  // ==========================================

  const fetchProductById = useCallback(async (id: string): Promise<Product> => {
    const result = await getProductAction(id);
    if (!result.success) throw new Error(result.error || "Product not found");
    return result.data as Product;
  }, []);

  // ==========================================
  // PRODUCT MUTATIONS
  // ==========================================

  const createProduct = useCallback(
    async (input: CreateProductHookInput) => {
      setIsMutating(true);
      try {
        const result = await createProductAction(input as Parameters<typeof createProductAction>[0]);
        if (!result.success) throw new Error(result.error);
        await fetchProducts();
        return { success: true as const, data: result.data };
      } catch (err: unknown) {
        return { success: false as const, error: getErrorMessage(err) };
      } finally {
        setIsMutating(false);
      }
    },
    [fetchProducts]
  );

  const updateProduct = useCallback(
    async (id: string, input: UpdateProductHookInput) => {
      setIsMutating(true);
      try {
        const result = await updateProductAction({ id, ...input });
        if (!result.success) throw new Error(result.error);
        await fetchProducts();
        return { success: true as const, data: result.data };
      } catch (err: unknown) {
        return { success: false as const, error: getErrorMessage(err) };
      } finally {
        setIsMutating(false);
      }
    },
    [fetchProducts]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      setIsMutating(true);
      try {
        const result = await deleteProductAction(id);
        if (!result.success) throw new Error(result.error);
        await fetchProducts();
        return { success: true as const };
      } catch (err: unknown) {
        return { success: false as const, error: getErrorMessage(err) };
      } finally {
        setIsMutating(false);
      }
    },
    [fetchProducts]
  );

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
    <VendorCatalogContext.Provider
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
    </VendorCatalogContext.Provider>
  );
}

// ==========================================
// HOOK
// ==========================================

export function useVendorCatalog() {
  const context = useContext(VendorCatalogContext);
  if (context === undefined) {
    throw new Error("useVendorCatalog must be used within a VendorCatalogProvider");
  }
  return context;
}