"use server";

import { prisma } from "@/lib/prisma/client";
import { ProductStatus, VendorUserRole, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";

// Helper function to create safe URL slugs
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * Multi-Tenant Security Guard
 * Verifies if a user is authorized to perform catalog modifications for a specific vendor.
 */
async function verifyVendorPermission(
  vendorId: string,
  userId: string,
  allowedRoles: VendorUserRole[] = [
    VendorUserRole.OWNER,
    VendorUserRole.ADMIN,
    VendorUserRole.MANAGER,
  ],
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vendorId: true, vendorRole: true },
  });

  if (
    !user ||
    user.vendorId !== vendorId ||
    !user.vendorRole ||
    !allowedRoles.includes(user.vendorRole)
  ) {
    throw new Error(
      "Access Denied: Unauthorized administrative operation for this shop partition.",
    );
  }

  return user;
}

// ==========================================
// INTERFACES FOR INPUT VALIDATION
// ==========================================

interface VariantInput {
  sku: string;
  name: string;
  price: number;
  inventoryCount: number;
  options: Prisma.InputJsonValue; // 1. FIXED: Avoids 'any' for loose JSON / JSONB metadata types
}

interface ImageInput {
  url: string;
  isFeatured: boolean;
  sortOrder: number;
}

interface CreateProductInput {
  vendorId: string;
  requestedByUserId: string;
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
  vendorId: string;
  requestedByUserId: string;
  categoryId?: string | null;
  name?: string;
  description?: string | null;
  basePrice?: number;
  compareAtPrice?: number | null;
  status?: ProductStatus;
  sku?: string | null;
  images?: ImageInput[];
}

// ==========================================
// SERVER ACTIONS
// ==========================================

/**
 * Secure Action: Asserts authorization boundaries and pushes a new product
 * along with its associated imagery and variants into the vendor sandbox.
 */
export async function createVendorProduct(input: CreateProductInput) {
  const {
    vendorId,
    requestedByUserId,
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

  // 1. Enforce multi-tenant access control
  await verifyVendorPermission(vendorId, requestedByUserId);

  // 2. Generate a scope-isolated unique slug matching @@unique([vendorId, slug])
  const baseSlug = generateSlug(name);
  let finalSlug = baseSlug;
  let counter = 1;

  // Prevent internal slug collision within the merchant's sub-catalog
  while (
    await prisma.product.findUnique({
      where: { vendorId_slug: { vendorId, slug: finalSlug } },
    })
  ) {
    finalSlug = `${baseSlug}-${counter++}`;
  }

  // 3. Persist catalog data safely inside an atomic transaction
  return await prisma.$transaction(async (tx) => {
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

        // Handle child relational updates cleanly using nested Prisma writes
        images: {
          createMany: {
            data: images.map((img) => ({
              url: img.url,
              isFeatured: img.isFeatured,
              sortOrder: img.sortOrder,
            })),
          },
        },
        variants: {
          createMany: {
            data: variants.map((v) => ({
              sku: v.sku,
              name: v.name,
              price: new Decimal(v.price),
              inventoryCount: v.inventoryCount,
              options: v.options ?? Prisma.DbNull,
            })),
          },
        },
      },
      include: {
        images: true,
        variants: true,
      },
    });

    // 4. Record entry to the system AuditLog for compliance tracking
    await tx.auditLog.create({
      data: {
        vendorId,
        userId: requestedByUserId,
        action: "PRODUCT_CREATED",
        entity: "Product",
        entityId: product.id,
        newValues: JSON.parse(JSON.stringify(product)),
      },
    });

    return { success: true, productId: product.id, slug: product.slug };
  });
}

/**
 * Secure Action: Mutates a product while verifying boundaries, logging
 * old versus new parameters in an audit trail.
 */
export async function updateVendorProduct(
  productId: string,
  input: UpdateProductInput,
) {
  const { vendorId, requestedByUserId, images, ...mutations } = input;

  // 1. Enforce validation bounds
  await verifyVendorPermission(vendorId, requestedByUserId);

  // 2. Retrieve old version to compile audit log variances
  const existingProduct = await prisma.product.findFirst({
    where: { id: productId, vendorId },
  });

  if (!existingProduct) {
    throw new Error(
      "Target resource not found or isolated outside your store boundary.",
    );
  }

  const dataPayload: Prisma.ProductUncheckedUpdateInput = {
    name: mutations.name,
    status: mutations.status,
    description: mutations.description,
    categoryId: mutations.categoryId,
    sku: mutations.sku,
  };

  if (mutations.basePrice !== undefined) {
    dataPayload.basePrice = new Decimal(mutations.basePrice);
  }
  if (mutations.compareAtPrice !== undefined) {
    dataPayload.compareAtPrice = mutations.compareAtPrice
      ? new Decimal(mutations.compareAtPrice)
      : null;
  }

  if (mutations.name) {
    const baseSlug = generateSlug(mutations.name);
    let finalSlug = baseSlug;
    let counter = 1;

    while (
      await prisma.product.findFirst({
        where: { vendorId, slug: finalSlug, NOT: { id: productId } },
      })
    ) {
      finalSlug = `${baseSlug}-${counter++}`;
    }
    dataPayload.slug = finalSlug;
  }

  return await prisma.$transaction(async (tx) => {
    // Re-link structural images if updated
    if (images) {
      await tx.productImage.deleteMany({ where: { productId } });
      dataPayload.images = {
        createMany: {
          data: images.map((img) => ({
            url: img.url,
            isFeatured: img.isFeatured,
            sortOrder: img.sortOrder,
          })),
        },
      };
    }

    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: dataPayload,
    });

    // 3. Write complete state divergence log
    await tx.auditLog.create({
      data: {
        vendorId,
        userId: requestedByUserId,
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

/**
 * Secure Action: Safely archives products by changing status to ARCHIVED,
 * preventing cascading hard deletes from deleting past checkout order items.
 */
export async function archiveVendorProduct(
  productId: string,
  vendorId: string,
  requestedByUserId: string,
) {
  await verifyVendorPermission(vendorId, requestedByUserId);

  const existingProduct = await prisma.product.findFirst({
    where: { id: productId, vendorId },
  });

  if (!existingProduct) {
    throw new Error(
      "Target resource not found or isolated outside your store boundary.",
    );
  }

  return await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ARCHIVED, deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        vendorId,
        userId: requestedByUserId,
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
