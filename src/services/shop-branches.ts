import { Prisma, ShopBranchType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { requireVendorContext } from "@/lib/auth/vendor-context";

export const shopBranchInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  branchType: z.enum(ShopBranchType).default(ShopBranchType.STORE),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
  pickupEnabled: z.boolean().default(false),
  deliveryEnabled: z.boolean().default(false),
  addressLine: z.string().trim().max(500).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  district: z.string().trim().max(120).nullable().optional(),
  country: z.string().trim().max(120).nullable().optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  openingHours: z.record(z.string(), z.string().max(120)).nullable().optional(),
  pickupInstructions: z.string().trim().max(2000).nullable().optional(),
  deliveryAreas: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  deliveryFee: z.coerce.number().finite().nonnegative().nullable().optional(),
  deliveryEstimate: z.string().trim().max(200).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.isActive && !value.pickupEnabled && !value.deliveryEnabled) context.addIssue({ code: "custom", path: ["pickupEnabled"], message: "An active location must offer pickup or delivery." });
  if (value.pickupEnabled && !value.addressLine) context.addIssue({ code: "custom", path: ["addressLine"], message: "A pickup address is required." });
  if (value.deliveryEnabled && value.deliveryFee == null) context.addIssue({ code: "custom", path: ["deliveryFee"], message: "Set a delivery fee, including zero for free delivery." });
});

export class ShopBranchError extends Error {
  code: string;
  constructor(message: string, code = "VALIDATION_ERROR") { super(message); this.code = code; }
}

const clean = <T extends Record<string, unknown>>(input: T) => Object.fromEntries(Object.entries(input).map(([key, value]) => [key, typeof value === "string" ? value.trim() || null : value])) as T;

export class ShopBranchService {
  static async listForCurrentVendor() {
    const context = await requireVendorContext("vendor:manage_shop", { allowInactiveShop: true });
    return prisma.shopBranch.findMany({ where: { shopId: context.vendorId }, orderBy: [{ isPrimary: "desc" }, { name: "asc" }] });
  }

  static async createForCurrentVendor(raw: unknown) {
    const context = await requireVendorContext("vendor:manage_shop");
    const input = clean(shopBranchInputSchema.parse(raw));
    const { openingHours, ...values } = input;
    return prisma.$transaction(async (tx) => {
      if (input.isPrimary) await tx.shopBranch.updateMany({ where: { shopId: context.vendorId, isPrimary: true }, data: { isPrimary: false } });
      const branch = await tx.shopBranch.create({ data: { ...values, openingHours: openingHours === null ? Prisma.JsonNull : openingHours, shopId: context.vendorId } });
      await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "SHOP_BRANCH_CREATED", entity: "ShopBranch", entityId: branch.id, newValues: { name: branch.name, isPrimary: branch.isPrimary } } });
      return branch;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  static async updateForCurrentVendor(id: string, raw: unknown) {
    const context = await requireVendorContext("vendor:manage_shop");
    const input = clean(shopBranchInputSchema.parse(raw));
    const { openingHours, ...values } = input;
    return prisma.$transaction(async (tx) => {
      const existing = await tx.shopBranch.findFirst({ where: { id, shopId: context.vendorId } });
      if (!existing) throw new ShopBranchError("Location not found.", "NOT_FOUND");
      if (!input.isActive) {
        const activeOrder = await tx.subOrder.findFirst({ where: { branchId: id, fulfillmentStatus: { in: ["PENDING", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] } }, select: { id: true } });
        if (activeOrder) throw new ShopBranchError("This location has active orders and cannot be disabled yet.", "CONFLICT");
      }
      if (input.isPrimary) await tx.shopBranch.updateMany({ where: { shopId: context.vendorId, isPrimary: true, id: { not: id } }, data: { isPrimary: false } });
      const branch = await tx.shopBranch.update({ where: { id }, data: { ...values, openingHours: openingHours === null ? Prisma.JsonNull : openingHours } });
      await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "SHOP_BRANCH_UPDATED", entity: "ShopBranch", entityId: id, newValues: { name: branch.name, isActive: branch.isActive, isPrimary: branch.isPrimary } } });
      return branch;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
