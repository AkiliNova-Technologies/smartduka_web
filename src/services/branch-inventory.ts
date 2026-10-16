import { InventoryMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { allocatedBranchStock, lockInventoryIdentity, serializableInventoryTransaction } from "@/services/inventory-integrity";

export class BranchInventoryError extends Error { code: string; constructor(message: string, code = "VALIDATION_ERROR") { super(message); this.code = code; } }
export class BranchInventoryService {
  static async list(branchId?: string) {
    const c = await requireVendorContext("vendor:manage_products");
    const [profile, inventories, branches, products] = await Promise.all([
      prisma.vendorProfile.findUniqueOrThrow({ where: { id: c.vendorId }, select: { branchInventoryEnabled: true } }),
      prisma.branchInventory.findMany({ where: { shopId: c.vendorId, ...(branchId ? { branchId } : {}) }, include: { branch: { select: { name: true } }, product: { select: { name: true } }, variant: { select: { name: true, sku: true } }, movements: { orderBy: { createdAt: "desc" }, take: 20 } }, orderBy: { updatedAt: "desc" } }),
      prisma.shopBranch.findMany({ where: { shopId: c.vendorId }, select: { id: true, name: true, isActive: true }, orderBy: [{ isPrimary: "desc" }, { name: "asc" }] }),
      prisma.product.findMany({ where: { vendorId: c.vendorId, deletedAt: null }, select: { id: true, name: true, sku: true, inventoryCount: true, variants: { select: { id: true, name: true, sku: true, inventoryCount: true, isActive: true } } }, orderBy: { name: "asc" } }),
    ]);
    return { mode: profile.branchInventoryEnabled ? "LOCATION_MANAGED" as const : "STANDARD" as const, inventories, branches, products };
  }
  static async enable() {
    const c = await requireVendorContext("vendor:manage_products");
    return serializableInventoryTransaction(async (tx) => {
      const profile = await tx.vendorProfile.findUniqueOrThrow({ where: { id: c.vendorId }, select: { branchInventoryEnabled: true } });
      if (profile.branchInventoryEnabled) return { mode: "LOCATION_MANAGED" as const, replayed: true };
      const activeBranches = await tx.shopBranch.count({ where: { shopId: c.vendorId, isActive: true } });
      if (!activeBranches) throw new BranchInventoryError("Add and activate at least one location before enabling location-specific inventory.");
      const allocations = await tx.branchInventory.findMany({ where: { shopId: c.vendorId }, select: { productId: true, variantId: true } });
      for (const identity of new Map(allocations.map((row) => [`${row.productId}:${row.variantId ?? ""}`, row])).values()) {
        await lockInventoryIdentity(tx, c.vendorId, identity.productId, identity.variantId);
        const canonical = identity.variantId
          ? (await tx.productVariant.findFirst({ where: { id: identity.variantId, productId: identity.productId }, select: { inventoryCount: true } }))?.inventoryCount
          : (await tx.product.findFirst({ where: { id: identity.productId, vendorId: c.vendorId }, select: { inventoryCount: true } }))?.inventoryCount;
        if (canonical == null || await allocatedBranchStock(tx, c.vendorId, identity.productId, identity.variantId) > canonical) throw new BranchInventoryError("Existing location allocations must be reconciled before enabling location-specific inventory.", "CONFLICT");
      }
      await tx.vendorProfile.update({ where: { id: c.vendorId }, data: { branchInventoryEnabled: true } });
      return { mode: "LOCATION_MANAGED" as const, replayed: false };
    });
  }
  static async mutate(input: { requestId: string; branchId: string; productId: string; variantId?: string | null; operation: "ALLOCATE" | "RESTOCK" | "ADJUST"; quantity: number; reason?: string }) {
    const c = await requireVendorContext("vendor:manage_products");
    if (!input.requestId?.trim()) throw new BranchInventoryError("requestId is required.");
    if (!Number.isSafeInteger(input.quantity) || input.quantity === 0 || (input.operation !== "ADJUST" && input.quantity < 0)) throw new BranchInventoryError("Quantity must be a non-zero integer; allocation and restock must be positive.");
    if (input.operation === "ADJUST" && !input.reason?.trim()) throw new BranchInventoryError("A reason is required for adjustments.");
    return serializableInventoryTransaction(async (tx) => {
      const profile = await tx.vendorProfile.findUniqueOrThrow({ where: { id: c.vendorId }, select: { branchInventoryEnabled: true } });
      if (!profile.branchInventoryEnabled) throw new BranchInventoryError("Enable location-specific inventory before managing stock by location.", "CONFLICT");
      const replay = await tx.inventoryMovement.findUnique({ where: { shopId_requestId: { shopId: c.vendorId, requestId: input.requestId } }, include: { inventory: true } });
      if (replay) return { inventory: replay.inventory, movement: replay, replayed: true };
      const branch = await tx.shopBranch.findFirst({ where: { id: input.branchId, shopId: c.vendorId, isActive: true }, select: { id: true } });
      if (!branch) throw new BranchInventoryError("Branch or product not found.", "NOT_FOUND");
      await lockInventoryIdentity(tx, c.vendorId, input.productId, input.variantId);
      const product = await tx.product.findFirst({ where: { id: input.productId, vendorId: c.vendorId, deletedAt: null }, select: { inventoryCount: true, variants: { select: { id: true, inventoryCount: true } } } });
      if (!product) throw new BranchInventoryError("Branch or product not found.", "NOT_FOUND");
      const variant = input.variantId ? product.variants.find((row) => row.id === input.variantId) : null;
      if (input.variantId && !variant) throw new BranchInventoryError("Variant does not belong to this product.");
      if (!input.variantId && product.variants.length) throw new BranchInventoryError("Select a variant for this product.");
      const canonical = variant?.inventoryCount ?? product.inventoryCount;
      const allocated = await allocatedBranchStock(tx, c.vendorId, input.productId, input.variantId);
      if (input.operation === "ALLOCATE" && allocated + input.quantity > canonical) throw new BranchInventoryError("Allocation exceeds unallocated canonical stock.", "INSUFFICIENT_STOCK");
      const existing = await tx.branchInventory.findFirst({ where: { branchId: input.branchId, productId: input.productId, variantId: input.variantId ?? null } });
      if (!existing && input.quantity < 0) throw new BranchInventoryError("Branch stock cannot become negative.", "INSUFFICIENT_STOCK");
      if (input.operation === "ADJUST" && input.quantity < 0 && (existing?.onHandQuantity ?? 0) < -input.quantity) throw new BranchInventoryError("Branch stock cannot become negative.", "INSUFFICIENT_STOCK");
      if (input.operation !== "ALLOCATE") {
        if (input.variantId) {
          if (input.quantity < 0) { const changed = await tx.productVariant.updateMany({ where: { id: input.variantId, inventoryCount: { gte: -input.quantity } }, data: { inventoryCount: { increment: input.quantity } } }); if (!changed.count) throw new BranchInventoryError("Canonical stock cannot become negative.", "INSUFFICIENT_STOCK"); }
          else await tx.productVariant.update({ where: { id: input.variantId }, data: { inventoryCount: { increment: input.quantity } } });
          await tx.product.update({ where: { id: input.productId }, data: { inventoryCount: (await tx.productVariant.aggregate({ where: { productId: input.productId, isActive: true }, _sum: { inventoryCount: true } }))._sum.inventoryCount ?? 0 } });
        } else if (input.quantity < 0) { const changed = await tx.product.updateMany({ where: { id: input.productId, inventoryCount: { gte: -input.quantity } }, data: { inventoryCount: { increment: input.quantity } } }); if (!changed.count) throw new BranchInventoryError("Canonical stock cannot become negative.", "INSUFFICIENT_STOCK"); }
        else await tx.product.update({ where: { id: input.productId }, data: { inventoryCount: { increment: input.quantity } } });
      }
      const inventory = existing ? await tx.branchInventory.update({ where: { id: existing.id }, data: { onHandQuantity: { increment: input.quantity } } }) : await tx.branchInventory.create({ data: { branchId: input.branchId, shopId: c.vendorId, productId: input.productId, variantId: input.variantId ?? null, onHandQuantity: input.quantity } });
      const movement = await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, branchId: input.branchId, shopId: c.vendorId, productId: input.productId, variantId: input.variantId ?? null, movementType: input.operation === "ALLOCATE" ? InventoryMovementType.INITIAL_ALLOCATION : input.operation === "RESTOCK" ? InventoryMovementType.RESTOCK : InventoryMovementType.ADJUSTMENT, quantity: input.quantity, requestId: input.requestId, reason: input.reason?.trim() || (input.operation === "RESTOCK" ? "Branch restock" : "Branch allocation"), createdById: c.user.id } });
      return { inventory, movement, replayed: false };
    });
  }
  static allocate(input: { requestId?: string; branchId: string; productId: string; variantId?: string | null; quantity: number; reason?: string }) {
    return this.mutate({ ...input, requestId: input.requestId ?? crypto.randomUUID(), operation: "ALLOCATE" });
  }
}
