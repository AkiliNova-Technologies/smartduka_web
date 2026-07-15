"use server";

import { revalidatePath } from "next/cache";
import {
  CategoryService,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/services/category";
import { withErrorHandling, validateRequiredFields } from "@/lib/api-utils";

export async function getCategoryDetailsAction(id: string) {
  return withErrorHandling(async () => {
    const category = await CategoryService.getCategoryById(id);
    if (!category) throw new Error("Category record not found.");
    return category;
  }, "getCategoryDetailsAction");
}

export async function getCategoryBySlugAction(slug: string) {
  return withErrorHandling(async () => {
    const category = await CategoryService.getCategoryBySlug(slug);
    if (!category) throw new Error("Category not found.");
    return category;
  }, "getCategoryBySlugAction");
}

export async function getProductsByCategorySlugAction(slug: string, sort?: string) {
  return withErrorHandling(
    () => CategoryService.getProductsByCategorySlug(slug, { sort }),
    "getProductsByCategorySlugAction"
  );
}

export async function createCategoryAction(formData: CreateCategoryInput) {
  const validationError = validateRequiredFields(formData, ["name", "slug"]);
  if (validationError) {
    return { success: false as const, error: validationError };
  }

  return withErrorHandling(async () => {
    await CategoryService.createCategoryWithSubs(formData);
    revalidatePath("/admin/categories");
    return { created: true };
  }, "createCategoryAction");
}

export async function deleteCategoryAction(id: string) {
  return withErrorHandling(async () => {
    await CategoryService.deleteCategory(id);
    revalidatePath("/admin/categories");
    return { deleted: true };
  }, "deleteCategoryAction");
}

export async function updateCategoryAction(formData: UpdateCategoryInput) {
  const validationError = validateRequiredFields(formData, ["id", "name", "slug"]);
  if (validationError) {
    return { success: false as const, error: validationError };
  }

  return withErrorHandling(async () => {
    await CategoryService.updateCategory(formData);
    revalidatePath("/admin/categories");
    return { updated: true };
  }, "updateCategoryAction");
}