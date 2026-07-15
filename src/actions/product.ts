"use server";

import { revalidatePath } from "next/cache";
import {
  ProductService,
  CreateProductInput,
  UpdateProductInput,
} from "@/services/product";
import { withErrorHandling, validateRequiredFields } from "@/lib/api-utils";
import { Product } from "@/types/marketplace";

// ==========================================
// TYPE-SAFE SERIALIZATION
// ==========================================

function serializeProductBasic(prismaProduct: Record<string, unknown>): Product {
  return {
    id: prismaProduct.id as string,
    vendorId: prismaProduct.vendorId as string,
    categoryId: prismaProduct.categoryId as string | null,
    subCategoryId: prismaProduct.subCategoryId as string | null | undefined,
    name: prismaProduct.name as string,
    slug: prismaProduct.slug as string,
    brand: prismaProduct.brand as string | null,
    description: prismaProduct.description as string | null | undefined,
    basePrice: Number(prismaProduct.basePrice),
    compareAtPrice: prismaProduct.compareAtPrice != null ? Number(prismaProduct.compareAtPrice) : null,
    inventoryCount: prismaProduct.inventoryCount as number,
    sku: (prismaProduct.sku as string) || null,  // ✅ Normalize undefined → null
    status: prismaProduct.status as Product["status"],
    rating: prismaProduct.rating as number | undefined,
    reviews: prismaProduct.reviews as number | undefined,
    image: (prismaProduct.image as string) || "",
    images: prismaProduct.images as Product["images"],
    sizes: prismaProduct.sizes as string[],
    colors: prismaProduct.colors as string[],
    specs: prismaProduct.specs as Product["specs"],
    tags: prismaProduct.tags as string[],
    createdAt: prismaProduct.createdAt as string | undefined,
    updatedAt: prismaProduct.updatedAt as string | undefined,
    category: prismaProduct.category as Product["category"],
    subCategory: prismaProduct.subCategory as Product["subCategory"],
    vendor: prismaProduct.vendor as Product["vendor"],
  };
}

// ==========================================
// PUBLIC PRODUCT DETAIL TYPES
// ==========================================

export interface SerializedPublicProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string;
  basePrice: number;
  compareAtPrice: number | null;
  inventoryCount: number;
  sku: string | null;  // ✅ No undefined — normalizes to null
  status: string;
  sizes: string[];
  colors: string[];
  specs: { name: string; value: string }[];
  tags: string[];
  images: { id: string; url: string; isFeatured: boolean }[];
  category: { id: string; name: string; slug: string } | null;
  subCategory: { id: string; name: string; slug: string } | null;
  vendor: {
    id: string;
    storeName: string;
    slug: string;
    logoUrl: string | null;
    isVerified: boolean;
  } | null;
  rating: number;
  reviewCount: number;
  reviews: {
    id: string;
    user: string;
    avatarUrl: string | null;
    rating: number;
    date: string;
    comment: string;
    verifiedPurchase: boolean;
  }[];
  availability: string;
  createdAt: string;
}

export interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  image: string;
  vendorId: string;
  rating: number;
  reviews: number;
}

export interface PublicProductResult {
  product: SerializedPublicProduct;
  relatedProducts: RelatedProduct[];
}

function serializePublicProduct(product: Record<string, unknown>): SerializedPublicProduct {
  const images = (product.images as { id: string; url: string; isFeatured: boolean }[]) || [];
  const reviews = (product.reviews as {
    id: string;
    rating: number;
    comment?: string;
    verifiedPurchase?: boolean;
    createdAt: string | Date;
    user?: { name?: string; avatarUrl?: string | null };
  }[]) || [];
  const vendor = product.vendor as Record<string, unknown> | null | undefined;
  const category = product.category as Record<string, unknown> | null | undefined;
  const subCategory = product.subCategory as Record<string, unknown> | null | undefined;
  const specs = (product.specs as { name: string; value: string }[]) || [];
  const createdAt = product.createdAt instanceof Date
    ? product.createdAt.toISOString()
    : (product.createdAt as string) || new Date().toISOString();

  return {
    id: product.id as string,
    name: product.name as string,
    slug: product.slug as string,
    brand: (product.brand as string) || null,
    description: (product.description as string) || "",
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    inventoryCount: product.inventoryCount as number,
    sku: (product.sku as string) || null,  // ✅ Normalize undefined → null
    status: product.status as string,
    sizes: (product.sizes as string[]) || [],
    colors: (product.colors as string[]) || [],
    specs,
    tags: (product.tags as string[]) || [],
    images: images.map((img) => ({
      id: img.id,
      url: img.url,
      isFeatured: img.isFeatured,
    })),
    category: category
      ? { id: category.id as string, name: category.name as string, slug: category.slug as string }
      : null,
    subCategory: subCategory
      ? { id: subCategory.id as string, name: subCategory.name as string, slug: subCategory.slug as string }
      : null,
    vendor: vendor
      ? {
          id: vendor.id as string,
          storeName: vendor.storeName as string,
          slug: vendor.slug as string,
          logoUrl: vendor.logoUrl as string | null,
          isVerified: vendor.isVerified as boolean,
        }
      : null,
    rating:
      reviews.length > 0
        ? Number(
            (
              reviews.reduce((sum, r) => sum + r.rating, 0) /
              reviews.length
            ).toFixed(1)
          )
        : 0,
    reviewCount: ((product._count as { reviews?: number })?.reviews) || 0,
    reviews: reviews.map((r) => ({
      id: r.id,
      user: r.user?.name || "Anonymous",
      avatarUrl: r.user?.avatarUrl || null,
      rating: r.rating,
      date: typeof r.createdAt === "string"
        ? r.createdAt.split("T")[0]
        : r.createdAt.toISOString().split("T")[0],
      comment: r.comment || "",
      verifiedPurchase: r.verifiedPurchase || false,
    })),
    availability:
      (product.inventoryCount as number) > 0
        ? "In Stock - Dispatch Available via Boda Riders"
        : "Out of Stock",
    createdAt,
  };
}

// ==========================================
// READ ACTIONS
// ==========================================

export async function getProductAction(id: string) {
  return withErrorHandling(async () => {
    const product = await ProductService.getProductById(id);
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
    const product = await ProductService.getProductBySlug(slug);
    if (!product) {
      throw new Error("Product not found.");
    }
    return serializeProductBasic(product as unknown as Record<string, unknown>);
  }, "getProductBySlugAction");
}

// ==========================================
// CREATE ACTION
// ==========================================

export async function createProductAction(input: CreateProductInput) {
  const validationError = validateRequiredFields(input, [
    "name",
    "slug",
    "basePrice",
    "vendorId",
  ]);

  if (validationError) {
    return { success: false as const, error: validationError };
  }

  return withErrorHandling(async () => {
    const product = await ProductService.createProduct(input);
    revalidatePath("/vendor/products");
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return serializeProductBasic(product as unknown as Record<string, unknown>);
  }, "createProductAction");
}

// ==========================================
// UPDATE ACTION
// ==========================================

export async function updateProductAction(input: UpdateProductInput) {
  const validationError = validateRequiredFields(input, ["id"]);

  if (validationError) {
    return { success: false as const, error: validationError };
  }

  return withErrorHandling(async () => {
    const product = await ProductService.updateProduct(input);
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

    const serializedProduct = serializePublicProduct(
      product as unknown as Record<string, unknown>
    );

    const relatedProducts: RelatedProduct[] = [];
    const categoryId = (product as { categoryId?: string }).categoryId;
    const productId = (product as { id: string }).id;

    if (categoryId) {
      const relatedRaw = await ProductService.getRelatedProducts(
        categoryId,
        productId,
        4
      );
      for (const p of relatedRaw) {
        relatedProducts.push({
          id: p.id,
          name: p.name,
          slug: p.slug,
          brand: p.brand,
          basePrice: Number(p.basePrice),
          compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
          image: p.images[0]?.url || "",
          vendorId: p.vendorId,
          rating: 4.5,
          reviews: 0,
        });
      }
    }

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

// ==========================================
// DELETE ACTION
// ==========================================

export async function deleteProductAction(id: string) {
  return withErrorHandling(async () => {
    await ProductService.deleteProduct(id);
    revalidatePath("/vendor/products");
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { deleted: true };
  }, "deleteProductAction");
}