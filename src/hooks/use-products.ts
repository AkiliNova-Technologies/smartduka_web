"use client";

import * as React from "react";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  getProductAction,
} from "@/actions/product";
import type { Product } from "@/types/marketplace";

interface UseProductsOptions {
  vendorId?: string;
  categoryId?: string;
  status?: string;
  search?: string;
  limit?: number;
}

// Define proper input types
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

export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isMutating, setIsMutating] = React.useState<boolean>(false);
  const fetchStartedRef = React.useRef(false);

  const queryString = React.useMemo(() => {
    const params = new URLSearchParams();
    if (options.vendorId) params.set("vendorId", options.vendorId);
    if (options.categoryId) params.set("categoryId", options.categoryId);
    if (options.status) params.set("status", options.status);
    if (options.search) params.set("search", options.search);
    if (options.limit) params.set("limit", options.limit.toString());
    return params.toString();
  }, [options.vendorId, options.categoryId, options.status, options.search, options.limit]);

  const fetchProducts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `/api/products${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setProducts(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch products");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [queryString]);

  const fetchProductById = async (id: string) => {
    try {
      const result = await getProductAction(id);
      if (!result.success) {
        throw new Error(result.error || "Product not found");
      }
      return result.data as Product;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch product";
      throw new Error(message);
    }
  };

  React.useEffect(() => {
    if (!fetchStartedRef.current) {
      fetchStartedRef.current = true;
      fetchProducts();
    }
  }, [fetchProducts]);

  const createProduct = async (input: CreateProductHookInput) => {
    setIsMutating(true);
    try {
      const result = await createProductAction(input as Parameters<typeof createProductAction>[0]);
      if (!result.success) throw new Error(result.error);
      await fetchProducts();
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
      await fetchProducts();
      return { success: true, data: result.data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update product";
      return { success: false, error: message };
    } finally {
      setIsMutating(false);
    }
  };

  // DELETE
  const deleteProduct = async (id: string) => {
    setIsMutating(true);
    try {
      const result = await deleteProductAction(id);
      if (!result.success) throw new Error(result.error);
      await fetchProducts();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete product";
      return { success: false, error: message };
    } finally {
      setIsMutating(false);
    }
  };

  return {
    products,
    isLoading,
    isMutating,
    error,
    refresh: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    fetchProductById,
  };
}