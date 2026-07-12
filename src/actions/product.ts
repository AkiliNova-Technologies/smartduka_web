"use server";

import { revalidatePath } from "next/cache";
import {
  ProductService,
  CreateProductInput,
  UpdateProductInput,
} from "@/services/product";
import { Product } from "@/types/marketplace";

// ==========================================
// READ ACTIONS
// ==========================================

export async function getProductAction(id: string) {
  try {
    const product = await ProductService.getProductById(id);
    if (!product) {
      return { success: false, error: "Product not found." };
    }

    const primaryImage =
      product.images.length > 0
        ? product.images.find((img) => img.isFeatured)?.url ||
          product.images[0].url
        : "";

    return {
      success: true,
      data: {
        ...product,
        image: primaryImage,
      } as unknown as Product,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch product.";
    return { success: false, error: message };
  }
}

export async function getProductBySlugAction(slug: string) {
  try {
    const product = await ProductService.getProductBySlug(slug);
    if (!product) {
      return { success: false, error: "Product not found." };
    }
    return { success: true, data: product };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch product.";
    return { success: false, error: message };
  }
}

// ==========================================
// CREATE ACTION
// ==========================================

export async function createProductAction(input: CreateProductInput) {
  try {
    if (!input.name || !input.slug || !input.basePrice || !input.vendorId) {
      return {
        success: false,
        error: "Missing required fields: name, slug, basePrice, vendorId.",
      };
    }

    const product = await ProductService.createProduct(input);

    revalidatePath("/vendor/products");
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true, data: product };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create product.";
    return { success: false, error: message };
  }
}

// ==========================================
// UPDATE ACTION
// ==========================================

export async function updateProductAction(input: UpdateProductInput) {
  try {
    if (!input.id) {
      return { success: false, error: "Product ID is required." };
    }

    const product = await ProductService.updateProduct(input);

    revalidatePath("/vendor/products");
    revalidatePath("/admin/products");
    revalidatePath(`/products/${input.id}`);
    return { success: true, data: product };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update product.";
    return { success: false, error: message };
  }
}

// ==========================================
// DELETE ACTION
// ==========================================

export async function deleteProductAction(id: string) {
  try {
    await ProductService.deleteProduct(id);

    revalidatePath("/vendor/products");
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete product.";
    return { success: false, error: message };
  }
}