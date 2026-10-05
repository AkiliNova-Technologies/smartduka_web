import { prisma } from "@/lib/prisma/client";
import { requireVendorContext } from "@/lib/auth/vendor-context";

const lowStockThreshold = 5;
type Adjustment = { productId: string; variantId?: string; operation: "INCREMENT" | "DECREMENT" | "SET"; quantity: number; reason: string };
type InventoryRow = { productId: string; variantId: string | null; productName: string; variantName: string | null; sku: string | null; stock: number; lowStock: boolean; available: boolean };

export class VendorInventoryService {
  static async list(input: { page: number; pageSize: number; q?: string; lowStockOnly?: boolean }) {
    const context = await requireVendorContext("vendor:manage_products");
    const where = { vendorId: context.vendorId, deletedAt: null, ...(input.q ? { OR: [{ name: { contains: input.q, mode: "insensitive" as const } }, { sku: { contains: input.q, mode: "insensitive" as const } }, { variants: { some: { OR: [{ name: { contains: input.q, mode: "insensitive" as const } }, { sku: { contains: input.q, mode: "insensitive" as const } }] } } }] } : {}) };
    const products = await prisma.product.findMany({ where, select: { id: true, name: true, sku: true, inventoryCount: true, variants: { select: { id: true, name: true, sku: true, inventoryCount: true, isActive: true } } }, orderBy: { updatedAt: "desc" } });
    const rows: InventoryRow[] = products.flatMap<InventoryRow>((product) => product.variants.length
      ? product.variants.map((variant) => ({ productId: product.id, variantId: variant.id, productName: product.name, variantName: variant.name, sku: variant.sku, stock: variant.inventoryCount, lowStock: variant.inventoryCount <= lowStockThreshold, available: variant.isActive && variant.inventoryCount > 0 }))
      : [{ productId: product.id, variantId: null, productName: product.name, variantName: null, sku: product.sku, stock: product.inventoryCount, lowStock: product.inventoryCount <= lowStockThreshold, available: product.inventoryCount > 0 }]);
    const filtered = input.lowStockOnly ? rows.filter((row) => row.lowStock) : rows;
    const total = filtered.length;
    return { data: filtered.slice((input.page - 1) * input.pageSize, input.page * input.pageSize), total };
  }

  static async adjust(input: Adjustment) {
    const context = await requireVendorContext("vendor:manage_products");
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: input.productId, vendorId: context.vendorId, deletedAt: null }, select: { id: true, inventoryCount: true, variants: { select: { id: true } } } });
      if (!product) return null;
      if (input.variantId) {
        const variant = await tx.productVariant.findFirst({ where: { id: input.variantId, productId: product.id }, select: { id: true, inventoryCount: true } });
        if (!variant) return "variant-not-found" as const;
        const data = input.operation === "INCREMENT" ? { increment: input.quantity } : input.operation === "DECREMENT" ? { decrement: input.quantity } : undefined;
        if (input.operation === "DECREMENT") {
          const changed = await tx.productVariant.updateMany({ where: { id: variant.id, inventoryCount: { gte: input.quantity } }, data: { inventoryCount: data! } });
          if (!changed.count) return "insufficient" as const;
        } else await tx.productVariant.update({ where: { id: variant.id }, data: { inventoryCount: input.operation === "SET" ? input.quantity : data! } });
        const updated = await tx.productVariant.findUniqueOrThrow({ where: { id: variant.id }, select: { inventoryCount: true } });
        await tx.product.update({ where: { id: product.id }, data: { inventoryCount: (await tx.productVariant.aggregate({ where: { productId: product.id, isActive: true }, _sum: { inventoryCount: true } }))._sum.inventoryCount ?? 0 } });
        return { productId: product.id, variantId: variant.id, stock: updated.inventoryCount };
      }
      if (product.variants.length) return "variant-required" as const;
      if (input.operation === "DECREMENT") {
        const changed = await tx.product.updateMany({ where: { id: product.id, inventoryCount: { gte: input.quantity } }, data: { inventoryCount: { decrement: input.quantity } } });
        if (!changed.count) return "insufficient" as const;
      } else await tx.product.update({ where: { id: product.id }, data: { inventoryCount: input.operation === "SET" ? input.quantity : { increment: input.quantity } } });
      const updated = await tx.product.findUniqueOrThrow({ where: { id: product.id }, select: { inventoryCount: true } });
      return { productId: product.id, variantId: null, stock: updated.inventoryCount };
    });
    if (!result) { const error = new Error("Product not found."); Object.assign(error, { code: "NOT_FOUND" }); throw error; }
    if (typeof result === "string") { const error = new Error(result === "insufficient" ? "Stock cannot become negative." : result === "variant-required" ? "Select a variant for this product." : "Variant not found."); Object.assign(error, { code: result === "insufficient" ? "INSUFFICIENT_STOCK" : "NOT_FOUND" }); throw error; }
    await prisma.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "INVENTORY_ADJUSTED", entity: "Product", entityId: input.variantId ?? input.productId, newValues: { operation: input.operation, quantity: input.quantity, reason: input.reason, resultingStock: result.stock } } });
    return result;
  }
}
