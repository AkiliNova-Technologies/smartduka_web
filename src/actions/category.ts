"use server";

import { revalidatePath } from "next/cache";
import {
  CategoryService,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/services/category";

export async function getCategoryDetailsAction(id: string) {
  try {
    const category = await CategoryService.getCategoryById(id);
    if (!category)
      return { success: false, error: "Category record not found." };
    return { success: true, data: category };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal read operation failure.";
    return { success: false, error: message };
  }
}

export async function createCategoryAction(formData: CreateCategoryInput) {
  try {
    if (!formData.name || !formData.slug) {
      return {
        success: false,
        error: "Required parameters missing structural values.",
      };
    }

    await CategoryService.createCategoryWithSubs(formData);

    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal mutation execution engine error.";
    return { success: false, error: message };
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    await CategoryService.deleteCategory(id);
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to remove requested category configuration node.";
    return { success: false, error: message };
  }
}

export async function updateCategoryAction(formData: UpdateCategoryInput) {
  try {
    if (!formData.id || !formData.name || !formData.slug) {
      return {
        success: false,
        error: "Missing required transactional identity records.",
      };
    }

    await CategoryService.updateCategory(formData);

    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to commit node updates.";
    return { success: false, error: message };
  }
}