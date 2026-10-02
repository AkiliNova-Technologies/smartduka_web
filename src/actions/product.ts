"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache-policy";
import {
  ProductService,
  CreateProductInput,
  UpdateProductInput,
  serializeProductBasic as serializeProductForClient,
  serializeMarketplaceProduct,
  serializePublicProductDetail,
} from "@/services/product";
import { withErrorHandling, validateRequiredFields } from "@/lib/api-utils";
import { Product } from "@/types/marketplace";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { prisma } from "@/lib/prisma/client";
import type { CatalogSort } from "@/services/product";
import type { CatalogFilters } from "@/services/product";

// ==========================================
// TYPE-SAFE SERIALIZATION
// ==========================================

function serializeProductBasic(prismaProduct: Record<string, unknown>): Product {
  return serializeProductForClient(prismaProduct) as unknown as Product;
}

// ==========================================
// READ ACTIONS
// ==========================================

export async function getProductAction(id: string) {
  return withErrorHandling(async () => {
    const product = await ProductService.getPublicProductById(id);
    if (!product) {
      throw new Error("Product not found.");
    }

    const primaryImage =
      product.images.length > 0
        ? product.images.find((img) => img.isFeatured)?.url ||
          product.images[0].url
        : "";

    return {
      ...serializeProductBasic(product as unknown as Record<string, unknown>),
      image: primaryImage,
    };
  }, "getProductAction");
}

export async function getProductBySlugAction(slug: string) {
  return withErrorHandling(async () => {
    const product = await ProductService.getPublicProductBySlug(slug);
    if (!product) {
      throw new Error("Product not found.");
    }
    return serializeProductBasic(product as unknown as Record<string, unknown>);
  }, "getProductBySlugAction");
}

// ==========================================
// PRIVATE VENDOR READ
// ==========================================

export async function getVendorProductAction(id: string) {
  return withErrorHandling(async () => {
    const context = await requireVendorContext("vendor:manage_products");
    const product = await prisma.product.findFirst({ where: { id, vendorId: context.vendorId } });
    if (!product) throw new Error("Product not found.");
    return serializeProductBasic((await ProductService.getProductById(id)) as unknown as Record<string, unknown>);
  }, "getVendorProductAction");
}

export type CatalogCreateProductInput = Omit<CreateProductInput, "vendorId">;
export type CatalogUpdateProductInput = UpdateProductInput;

export async function createProductAction(input: CatalogCreateProductInput) {
  const validationError = validateRequiredFields(input, ["name", "slug", "basePrice"]);
  if (validationError) return { success: false as const, error: validationError };

  return withErrorHandling(async () => {
    const context = await requireVendorContext("vendor:manage_products");
    const product = await ProductService.createProduct({ ...input, vendorId: context.vendorId });
    updateTag(cacheTags.marketplace.products);
    updateTag(cacheTags.marketplace.discovery);
    revalidatePath("/vendor/products");
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return serializeProductBasic(product as unknown as Record<string, unknown>);
  }, "createProductAction");
}

// ==========================================
// UPDATE ACTION
// ==========================================

export async function updateProductAction(input: CatalogUpdateProductInput) {
  const validationError = validateRequiredFields(input, ["id"]);
  if (validationError) return { success: false as const, error: validationError };

  return withErrorHandling(async () => {
    const context = await requireVendorContext("vendor:manage_products");
    const existing = await prisma.product.findFirst({ where: { id: input.id, vendorId: context.vendorId } });
    if (!existing) throw new Error("Product not found.");
    const product = await ProductService.updateProduct(input);
    updateTag(cacheTags.marketplace.products);
    updateTag(cacheTags.marketplace.discovery);
    updateTag(cacheTags.product(product.id));
    updateTag(cacheTags.productSlug(existing.slug));
    updateTag(cacheTags.productSlug(product.slug));
    revalidatePath("/vendor/products");
    revalidatePath("/admin/products");
    revalidatePath(`/products/${input.id}`);
    return serializeProductBasic(product as unknown as Record<string, unknown>);
  }, "updateProductAction");
}

// ==========================================
// PUBLIC PRODUCT DETAIL ACTION
// ==========================================

export async function getPublicProductAction(slug: string) {
  return withErrorHandling(async () => {
    const product = await ProductService.getPublicProductBySlug(slug);
    if (!product) {
      throw new Error("Product not found.");
    }

    const serializedProduct = serializePublicProductDetail(
      product as unknown as Record<string, unknown>
    );

    const relatedProducts = await ProductService.getRelatedProducts(
      product,
      4,
    );

    return { product: serializedProduct, relatedProducts };
  }, "getPublicProductAction");
}

// ==========================================
// LISTING ACTIONS
// ==========================================

export async function getNewArrivalsAction(limit = 20) {
  return withErrorHandling(
    () => ProductService.getNewArrivals(limit),
    "getNewArrivalsAction"
  );
}

export async function getDealsAction() {
  return withErrorHandling(
    () => ProductService.getDeals(20),
    "getDealsAction"
  );
}

export async function getPublicCatalogAction(input?: {
  search?: string;
  sort?: CatalogSort;
} & CatalogFilters) {
  return withErrorHandling(async () => {
    const products = await ProductService.getPublicCatalogProducts(input);

    return products;
  }, "getPublicCatalogAction");
}

// ==========================================
// DELETE ACTION
// ==========================================

export async function deleteProductAction(id: string) {
  return withErrorHandling(async () => {
    const context = await requireVendorContext("vendor:manage_products");
    const existing = await prisma.product.findFirst({ where: { id, vendorId: context.vendorId } });
    if (!existing) throw new Error("Product not found.");
    await ProductService.deleteProduct(id);
    updateTag(cacheTags.marketplace.products);
    updateTag(cacheTags.marketplace.discovery);
    updateTag(cacheTags.product(id));
    updateTag(cacheTags.productSlug(existing.slug));
    revalidatePath("/vendor/products");
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { deleted: true };
  }, "deleteProductAction");
}
