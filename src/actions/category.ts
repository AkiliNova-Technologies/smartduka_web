"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache-policy";
import {
  CategoryService,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/services/category";
import { withErrorHandling } from "@/lib/api-utils";
import { requireAdminContext } from "@/lib/auth/admin-context";

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
  return withErrorHandling(async () => {
    await requireAdminContext("platform:manage");
    await CategoryService.createCategoryWithSubs(formData);
    updateTag(cacheTags.marketplace.categories);
    updateTag(cacheTags.marketplace.discovery);
    revalidatePath("/admin/categories");
    return { created: true };
  }, "createCategoryAction");
}

export async function deleteCategoryAction(id: string) {
  return withErrorHandling(async () => {
    await requireAdminContext("platform:manage");
    await CategoryService.deleteCategory(id);
    updateTag(cacheTags.marketplace.categories);
    updateTag(cacheTags.marketplace.discovery);
    revalidatePath("/admin/categories");
    return { deleted: true };
  }, "deleteCategoryAction");
}

export async function updateCategoryAction(formData: UpdateCategoryInput) {
  return withErrorHandling(async () => {
    await requireAdminContext("platform:manage");
    await CategoryService.updateCategory(formData);
    updateTag(cacheTags.marketplace.categories);
    updateTag(cacheTags.marketplace.discovery);
    revalidatePath("/admin/categories");
    return { updated: true };
  }, "updateCategoryAction");
}

export async function moveCategoryAction(id: string, parentId: string | null) {
  return withErrorHandling(async () => {
    await requireAdminContext("platform:manage");
    await CategoryService.moveCategory(id, parentId);
    updateTag(cacheTags.marketplace.categories);
    updateTag(cacheTags.marketplace.discovery);
    revalidatePath("/admin/categories");
    revalidatePath("/categories");
    return { moved: true };
  }, "moveCategoryAction");
}

export async function setCategoryStatusAction(id: string, isActive: boolean) {
  return withErrorHandling(async () => {
    await requireAdminContext("platform:manage");
    await CategoryService.setCategoryStatus(id, isActive);
    updateTag(cacheTags.marketplace.categories);
    updateTag(cacheTags.marketplace.discovery);
    revalidatePath("/admin/categories");
    revalidatePath("/categories");
    return { updated: true };
  }, "setCategoryStatusAction");
}
