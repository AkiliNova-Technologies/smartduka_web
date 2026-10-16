import type { FulfillmentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

export function branchSupportsMethod(branch: { isActive: boolean; pickupEnabled: boolean; deliveryEnabled: boolean }, method: FulfillmentMethod) {
  return branch.isActive && (method === "PICKUP" ? branch.pickupEnabled : branch.deliveryEnabled);
}

export function deliveryAreaSupported(areas: string[], district?: string | null) {
  return areas.length === 0 || Boolean(district?.trim() && areas.some((area) => area.toLocaleLowerCase() === district.trim().toLocaleLowerCase()));
}

export async function getPublicFulfillmentOptions(vendorIds: string[]) {
  const shops = await prisma.vendorProfile.findMany({
    where: { id: { in: vendorIds }, status: "ACTIVE", deletedAt: null },
    select: {
      id: true, storeName: true, fulfillmentMethods: true, deliveryFee: true, deliveryEstimate: true,
      pickupLocation: true, pickupDirections: true, pickupInstructions: true,
      returnWindowDays: true, returnPolicy: true, acceptsExchanges: true, exchangePolicy: true,
      branches: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }], select: {
        id: true, name: true, branchType: true, isPrimary: true, isActive: true, pickupEnabled: true,
        deliveryEnabled: true, addressLine: true, city: true, district: true, country: true,
        openingHours: true, pickupInstructions: true, deliveryAreas: true, deliveryFee: true, deliveryEstimate: true,
      } },
    },
  });
  return shops.map((shop) => {
    const configured = shop.branches.length > 0;
    const branches = shop.branches.filter((branch) => branch.isActive && (branch.deliveryEnabled || branch.pickupEnabled));
    const methods = configured
      ? [...new Set(branches.flatMap((branch) => [branch.deliveryEnabled ? "DELIVERY" : null, branch.pickupEnabled ? "PICKUP" : null]).filter(Boolean))] as FulfillmentMethod[]
      : shop.fulfillmentMethods;
    return {
      id: shop.id, storeName: shop.storeName, configurationMode: configured ? "BRANCH" as const : "LEGACY" as const,
      fulfillmentMethods: methods, deliveryFee: Number(shop.deliveryFee), deliveryEstimate: shop.deliveryEstimate,
      pickupLocation: shop.pickupLocation, pickupDirections: shop.pickupDirections, pickupInstructions: shop.pickupInstructions,
      returnWindowDays: shop.returnWindowDays, returnPolicy: shop.returnPolicy, acceptsExchanges: shop.acceptsExchanges, exchangePolicy: shop.exchangePolicy,
      branches: branches.map((branch) => ({ ...branch, deliveryFee: branch.deliveryFee == null ? null : Number(branch.deliveryFee) })),
    };
  });
}

export type BasketAvailabilityItem = { productId: string; variantId?: string | null; quantity: number };

export async function getBasketBranchAvailability(shopId: string, items: BasketAvailabilityItem[], options?: { method?: FulfillmentMethod; district?: string | null }) {
  const shop = await prisma.vendorProfile.findFirst({
    where: { id: shopId, status: "ACTIVE", deletedAt: null },
    select: {
      id: true, branchInventoryEnabled: true,
      branches: { select: { id: true, name: true, isActive: true, pickupEnabled: true, deliveryEnabled: true, deliveryAreas: true } },
    },
  });
  if (!shop) return null;
  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, vendorId: shopId, deletedAt: null, status: { in: ["ACTIVE", "PUBLISHED"] } },
    select: { id: true, inventoryCount: true, variants: { select: { id: true, inventoryCount: true, isActive: true } } },
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  const valid = items.every((item) => {
    const product = byId.get(item.productId);
    if (!product) return false;
    if (!item.variantId) return product.variants.length === 0 && product.inventoryCount >= item.quantity;
    const variant = product.variants.find((entry) => entry.id === item.variantId);
    return Boolean(variant?.isActive && variant.inventoryCount >= item.quantity);
  });
  if (!valid) return { shopId, branches: shop.branches.map((branch) => ({ id: branch.id, name: branch.name, status: branch.isActive ? "INSUFFICIENT_STOCK" as const : "INACTIVE" as const, reasonCode: "BASKET_STOCK_UNAVAILABLE" })) };
  const inventories = shop.branchInventoryEnabled ? await prisma.branchInventory.findMany({
    where: { shopId, productId: { in: productIds }, branchId: { in: shop.branches.map((branch) => branch.id) } },
    select: { branchId: true, productId: true, variantId: true, onHandQuantity: true, reservedQuantity: true },
  }) : [];
  return {
    shopId,
    branches: shop.branches.map((branch) => {
      if (!branch.isActive || (!branch.pickupEnabled && !branch.deliveryEnabled)) return { id: branch.id, name: branch.name, status: "INACTIVE" as const };
      if (options?.method && !branchSupportsMethod(branch, options.method)) return { id: branch.id, name: branch.name, status: "UNAVAILABLE" as const, reasonCode: "METHOD_NOT_SUPPORTED" };
      if (options?.method === "DELIVERY" && !deliveryAreaSupported(branch.deliveryAreas, options.district)) return { id: branch.id, name: branch.name, status: "UNAVAILABLE" as const, reasonCode: "DELIVERY_AREA_UNSUPPORTED" };
      const available = !shop.branchInventoryEnabled || items.every((item) => inventories.some((row) => row.branchId === branch.id && row.productId === item.productId && row.variantId === (item.variantId ?? null) && row.onHandQuantity - row.reservedQuantity >= item.quantity));
      return { id: branch.id, name: branch.name, status: available ? "AVAILABLE" as const : "INSUFFICIENT_STOCK" as const, ...(!available ? { reasonCode: "BRANCH_STOCK_INSUFFICIENT" } : {}) };
    }),
  };
}
