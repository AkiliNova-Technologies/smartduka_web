import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

type Tx = Prisma.TransactionClient;

export class InventoryIntegrityError extends Error {
  code = "INSUFFICIENT_STOCK";
}

export async function lockInventoryIdentity(tx: Tx, shopId: string, productId: string, variantId?: string | null) {
  const key = `${shopId}:${productId}:${variantId ?? "simple"}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}

export async function allocatedBranchStock(tx: Tx, shopId: string, productId: string, variantId?: string | null) {
  const value = await tx.branchInventory.aggregate({
    where: { shopId, productId, variantId: variantId ?? null },
    _sum: { onHandQuantity: true },
  });
  return value._sum.onHandQuantity ?? 0;
}

export async function assertCanonicalCoversAllocations(tx: Tx, input: { shopId: string; productId: string; variantId?: string | null; canonical: number }) {
  await lockInventoryIdentity(tx, input.shopId, input.productId, input.variantId);
  const allocated = await allocatedBranchStock(tx, input.shopId, input.productId, input.variantId);
  if (input.canonical < allocated) throw new InventoryIntegrityError("Stock cannot be reduced below the quantity allocated across branches.");
  return allocated;
}

export async function serializableInventoryTransaction<T>(work: (tx: Tx) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction((tx) => work(tx as unknown as Tx), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt === 2) throw error;
    }
  }
  throw new Error("Inventory transaction retry exhausted.");
}
