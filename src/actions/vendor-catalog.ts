"use server";

import { prisma } from "@/lib/prisma/client";
import { ProductStatus, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { requireVendorContext } from "@/lib/auth/vendor-context";

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

interface VariantInput {
  sku: string;
  name: string;
  price: number;
  inventoryCount: number;
  options: Prisma.InputJsonValue;
}

interface ImageInput {
  url: string;
  isFeatured: boolean;
  sortOrder: number;
}

interface CreateProductInput {
  categoryId?: string;
  name: string;
  description?: string;
  basePrice: number;
  compareAtPrice?: number;
  status?: ProductStatus;
  sku?: string;
  images?: ImageInput[];
  variants?: VariantInput[];
}

interface UpdateProductInput {
  categoryId?: string | null;
  name?: string;
  description?: string | null;
  basePrice?: number;
  compareAtPrice?: number | null;
  status?: ProductStatus;
  sku?: string | null;
  images?: ImageInput[];
}

export async function createVendorProduct(input: CreateProductInput) {
  const context = await requireVendorContext("vendor:manage_products");
  const {
    categoryId,
    name,
    description,
    basePrice,
    compareAtPrice,
    status = ProductStatus.DRAFT,
    sku,
    images = [],
    variants = [],
  } = input;
  const { vendorId } = context;

  const baseSlug = generateSlug(name);
  let finalSlug = baseSlug;
  let counter = 1;
  while (await prisma.product.findUnique({
    where: { vendorId_slug: { vendorId, slug: finalSlug } },
  })) {
    finalSlug = `${baseSlug}-${counter++}`;
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        vendorId,
        categoryId: categoryId || null,
        name,
        slug: finalSlug,
        description: description || null,
        basePrice: new Decimal(basePrice),
        compareAtPrice: compareAtPrice ? new Decimal(compareAtPrice) : null,
        status,
        sku: sku || null,
        images: {
          createMany: {
            data: images.map((image) => ({
              url: image.url,
              isFeatured: image.isFeatured,
              sortOrder: image.sortOrder,
            })),
          },
        },
        variants: {
          createMany: {
            data: variants.map((variant) => ({
              sku: variant.sku,
              name: variant.name,
              price: new Decimal(variant.price),
              inventoryCount: variant.inventoryCount,
              options: variant.options ?? Prisma.DbNull,
            })),
          },
        },
      },
      include: { images: true, variants: true },
    });

    await tx.auditLog.create({
      data: {
        vendorId,
        userId: context.user.id,
        action: "PRODUCT_CREATED",
        entity: "Product",
        entityId: product.id,
        newValues: JSON.parse(JSON.stringify(product)),
      },
    });

    return { success: true, productId: product.id, slug: product.slug };
  });
}

export async function updateVendorProduct(productId: string, input: UpdateProductInput) {
  const context = await requireVendorContext("vendor:manage_products");
  const { vendorId } = context;
  const { images, ...mutations } = input;
  const existingProduct = await prisma.product.findFirst({
    where: { id: productId, vendorId },
  });

  if (!existingProduct) {
    throw new Error("Target resource not found or isolated outside your store boundary.");
  }

  const dataPayload: Prisma.ProductUncheckedUpdateInput = {
    name: mutations.name,
    status: mutations.status,
    description: mutations.description,
    categoryId: mutations.categoryId,
    sku: mutations.sku,
  };
  if (mutations.basePrice !== undefined) dataPayload.basePrice = new Decimal(mutations.basePrice);
  if (mutations.compareAtPrice !== undefined) {
    dataPayload.compareAtPrice = mutations.compareAtPrice ? new Decimal(mutations.compareAtPrice) : null;
  }

  if (mutations.name) {
    const baseSlug = generateSlug(mutations.name);
    let finalSlug = baseSlug;
    let counter = 1;
    while (await prisma.product.findFirst({
      where: { vendorId, slug: finalSlug, NOT: { id: productId } },
    })) {
      finalSlug = `${baseSlug}-${counter++}`;
    }
    dataPayload.slug = finalSlug;
  }

  return prisma.$transaction(async (tx) => {
    if (images) {
      await tx.productImage.deleteMany({ where: { productId } });
      dataPayload.images = {
        createMany: {
          data: images.map((image) => ({
            url: image.url,
            isFeatured: image.isFeatured,
            sortOrder: image.sortOrder,
          })),
        },
      };
    }

    const updatedProduct = await tx.product.update({ where: { id: productId }, data: dataPayload });
    await tx.auditLog.create({
      data: {
        vendorId,
        userId: context.user.id,
        action: "PRODUCT_UPDATED",
        entity: "Product",
        entityId: productId,
        oldValues: JSON.parse(JSON.stringify(existingProduct)),
        newValues: JSON.parse(JSON.stringify(updatedProduct)),
      },
    });

    return { success: true, slug: updatedProduct.slug };
  });
}

export async function archiveVendorProduct(productId: string) {
  const context = await requireVendorContext("vendor:manage_products");
  const { vendorId } = context;
  const existingProduct = await prisma.product.findFirst({ where: { id: productId, vendorId } });

  if (!existingProduct) {
    throw new Error("Target resource not found or isolated outside your store boundary.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ARCHIVED, deletedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        vendorId,
        userId: context.user.id,
        action: "PRODUCT_ARCHIVED",
        entity: "Product",
        entityId: productId,
        oldValues: { status: existingProduct.status },
        newValues: { status: ProductStatus.ARCHIVED },
      },
    });
    return { success: true };
  });
}
