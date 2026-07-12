"use client";

import * as React from "react";
import { 
  createCategoryAction, 
  updateCategoryAction, 
  deleteCategoryAction 
} from "@/actions/category";
import { Category, CategoryTree } from "@/types/marketplace";


interface UseCategoriesOptions {
  mode?: "flat" | "tree";
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const mode = options.mode || "flat";
  
  const [categories, setCategories] = React.useState<Category[] | CategoryTree[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isMutating, setIsMutating] = React.useState<boolean>(false);
  const fetchStartedRef = React.useRef(false);

  // READ: Fetch Categories from API Route
  const fetchCategories = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/categories?mode=${mode}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        
        // Handle specific HTTP status codes
        if (response.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        } else if (response.status === 403) {
          throw new Error("You don't have permission to access this resource.");
        } else if (response.status === 404) {
          throw new Error("Categories not found.");
        } else if (response.status >= 500) {
          throw new Error("Server error. Please try again later.");
        }
        
        throw new Error(errorData?.error || `Request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setCategories(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch categories");
      }
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError("Network error. Please check your internet connection.");
      } else {
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  // Initial fetch on mount - using ref to prevent double execution
  React.useEffect(() => {
    if (!fetchStartedRef.current) {
      fetchStartedRef.current = true;
      fetchCategories();
    }
  }, [fetchCategories]);

  // CREATE
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
      
      await fetchCategories();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create category";
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsMutating(false);
    }
  };

  // UPDATE
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
      
      await fetchCategories();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update category";
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsMutating(false);
    }
  };

  // DELETE
  const deleteCategory = async (id: string) => {
    setIsMutating(true);
    try {
      const result = await deleteCategoryAction(id);
      if (!result.success) throw new Error(result.error);
      
      await fetchCategories();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete category";
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsMutating(false);
    }
  };

  return {
    categories,
    isLoading,
    isMutating,
    error,
    refresh: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory
  };
}