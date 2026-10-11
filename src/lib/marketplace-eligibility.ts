import { Prisma, ProductStatus, VendorStatus } from "@prisma/client";

/**
 * Authoritative relational predicates for customer-facing marketplace reads.
 * Keep these at the database boundary so pagination and counts never include
 * products which are removed later in memory.
 */
export const publicShopWhere = {
  status: VendorStatus.ACTIVE,
  deletedAt: null,
} satisfies Prisma.VendorProfileWhereInput;

export const publicProductWhere = {
  status: { in: [ProductStatus.ACTIVE, ProductStatus.PUBLISHED] },
  deletedAt: null,
  vendor: publicShopWhere,
} satisfies Prisma.ProductWhereInput;

export function isShopOperational(status: VendorStatus | string) {
  return status === VendorStatus.ACTIVE;
}
