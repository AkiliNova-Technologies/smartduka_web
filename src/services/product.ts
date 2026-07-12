import { prisma } from "@/lib/prisma/client";
import { Prisma, ProductStatus } from "@prisma/client";

// ==========================================
// INPUT TYPES
// ==========================================

export interface CreateProductInput {
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
  status?: "DRAFT" | "PUBLISHED";
  sizes?: string[];
  colors?: string[];
  specs?: Record<string, string>[];
  tags?: string[];
  images?: { url: string; isFeatured?: boolean; sortOrder?: number }[];
}

export interface UpdateProductInput {
  id: string;
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

export class ProductService {
  // ==========================================
  // READ OPERATIONS
  // ==========================================

  /**
   * Get all products with relations
   */
  static async getAllProducts(options?: {
    vendorId?: string;
    categoryId?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.ProductWhereInput = {};

    if (options?.vendorId) where.vendorId = options.vendorId;
    if (options?.categoryId) where.categoryId = options.categoryId;
    if (options?.status) {
  where.status = options.status as ProductStatus;
}
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { brand: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    return await prisma.product.findMany({
      where,
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        category: true,
        subCategory: true,
        vendor: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            logoUrl: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            variants: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * Get a single product by ID
   */
  static async getProductById(id: string) {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        category: true,
        subCategory: true,
        vendor: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            logoUrl: true,
            status: true,
          },
        },
        variants: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            reviews: true,
            variants: true,
            orderItems: true,
          },
        },
      },
    });
  }

  /**
   * Get product by slug
   */
  static async getProductBySlug(slug: string) {
    return await prisma.product.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        category: true,
        subCategory: true,
        vendor: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            logoUrl: true,
          },
        },
        variants: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });
  }

  /**
   * Get vendor's products
   */
  static async getVendorProducts(vendorId: string, options?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    return await this.getAllProducts({
      vendorId,
      ...options,
    });
  }

  // ==========================================
  // CREATE OPERATION
  // ==========================================

  /**
   * Create a new product with images
   */
  static async createProduct(input: CreateProductInput) {
    return await prisma.product.create({
      data: {
        vendorId: input.vendorId,
        name: input.name,
        slug: input.slug,
        brand: input.brand,
        description: input.description,
        basePrice: input.basePrice,
        compareAtPrice: input.compareAtPrice,
        categoryId: input.categoryId || null,
        subCategoryId: input.subCategoryId || null,
        inventoryCount: input.inventoryCount || 0,
        sku: input.sku,
        status: input.status || "DRAFT",
        sizes: input.sizes || [],
        colors: input.colors || [],
        specs: input.specs as Prisma.JsonArray,
        tags: input.tags || [],
        images: input.images ? {
          create: input.images.map((img, index) => ({
            url: img.url,
            isFeatured: img.isFeatured || index === 0,
            sortOrder: img.sortOrder || index,
          })),
        } : undefined,
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        category: true,
        subCategory: true,
      },
    });
  }

  // ==========================================
  // UPDATE OPERATION
  // ==========================================

  /**
   * Update an existing product
   */
  static async updateProduct(input: UpdateProductInput) {
    return await prisma.product.update({
      where: { id: input.id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.slug && { slug: input.slug }),
        ...(input.brand !== undefined && { brand: input.brand }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
        ...(input.compareAtPrice !== undefined && { compareAtPrice: input.compareAtPrice }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.subCategoryId !== undefined && { subCategoryId: input.subCategoryId }),
        ...(input.inventoryCount !== undefined && { inventoryCount: input.inventoryCount }),
        ...(input.sku !== undefined && { sku: input.sku }),
        ...(input.status && { status: input.status }),
        ...(input.sizes && { sizes: input.sizes }),
        ...(input.colors && { colors: input.colors }),
        ...(input.specs && { specs: input.specs as Prisma.JsonArray }),
        ...(input.tags && { tags: input.tags }),
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        category: true,
        subCategory: true,
      },
    });
  }

  // ==========================================
  // DELETE OPERATION (Soft Delete)
  // ==========================================

  /**
   * Soft delete a product
   */
  static async deleteProduct(id: string) {
    return await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "ARCHIVED",
      },
    });
  }

  /**
   * Permanently delete a product
   */
  static async hardDeleteProduct(id: string) {
    return await prisma.product.delete({
      where: { id },
    });
  }
}