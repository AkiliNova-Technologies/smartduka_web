import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

const MAX_SKU_ATTEMPTS = 5;

export function generateVariantSku(productId: string) {
  const productPart = productId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const randomPart = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `VAR-${productPart}-${randomPart}`;
}

export function isSkuCollision(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) && error.meta.target.includes("sku");
}

export async function createVariantWithSku(
  tx: Pick<typeof prisma, "productVariant">,
  data: Omit<Prisma.ProductVariantUncheckedCreateInput, "sku"> & { sku?: string },
) {
  const explicitSku = data.sku?.trim();
  if (explicitSku) return tx.productVariant.create({ data: { ...data, sku: explicitSku } });

  for (let attempt = 0; attempt < MAX_SKU_ATTEMPTS; attempt += 1) {
    try {
      return await tx.productVariant.create({ data: { ...data, sku: generateVariantSku(data.productId) } });
    } catch (error) {
      if (!isSkuCollision(error) || attempt === MAX_SKU_ATTEMPTS - 1) throw error;
    }
  }
  throw new Error("Unable to assign a unique variant SKU.");
}
