import { z } from "zod";

export const productQuerySchema = z.object({
  q: z.string().trim().max(120).optional(), categoryId: z.string().max(128).optional(),
  shopId: z.string().max(128).optional(), minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(), inStock: z.enum(["true", "false"]).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).optional(),
});
export const wishlistBodySchema = z.object({ productId: z.string().min(1).max(128) });
export const checkoutBodySchema = z.object({
  checkoutRequestId: z.string().min(16).max(128).regex(/^[A-Za-z0-9_-]+$/),
  items: z.array(z.object({ productId: z.string().min(1), variantId: z.string().min(1).nullable().optional(), quantity: z.number().int().positive() })).min(1),
  shippingAddress: z.string().trim().min(3).max(1000), shippingPhone: z.string().trim().min(3).max(100),
  shippingEmail: z.string().email().optional(), paymentGateway: z.enum(["PESAPAL", "CASH_ON_DELIVERY"]),
  notes: z.string().max(2000).optional(), fulfillmentSelections: z.array(z.object({ vendorId: z.string().min(1), method: z.enum(["DELIVERY", "PICKUP"]) })).optional(),
});
export const mePatchSchema = z.object({ name: z.string().trim().min(1).max(120).optional(), phone: z.string().trim().max(40).nullable().optional(), avatarUrl: z.string().url().max(2000).nullable().optional() }).strict();
export const vendorPayoutAccountSchema = z.object({ provider: z.enum(["MTN_MOBILE_MONEY", "AIRTEL_MONEY"]), accountHolderName: z.string().trim().min(2).max(120), mobileNumber: z.string().trim().min(7).max(32) }).strict();
export const deviceRegistrationSchema = z.object({ deviceId: z.string().trim().min(8).max(200), platform: z.enum(["IOS", "ANDROID"]), pushToken: z.string().trim().min(20).max(4096), appVersion: z.string().trim().max(80).optional(), deviceName: z.string().trim().max(120).optional() }).strict();
export const vendorShopPatchSchema = z.object({ storeName: z.string().trim().min(2).max(120).optional(), description: z.string().trim().max(5000).nullable().optional(), email: z.string().email().optional(), phone: z.string().trim().max(40).optional(), website: z.string().url().max(2000).nullable().optional(), address: z.string().trim().max(500).nullable().optional(), city: z.string().trim().max(120).nullable().optional(), country: z.string().trim().max(120).nullable().optional(), logoUrl: z.string().url().max(2000).nullable().optional(), bannerUrl: z.string().url().max(2000).nullable().optional() }).strict();
export const uploadAuthorizationSchema = z.object({ purpose: z.enum(["PRODUCT_IMAGE", "SHOP_LOGO", "SHOP_BANNER"]), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().positive().max(5 * 1024 * 1024) }).strict();
const variantSchema = z.object({
  id: z.string().uuid().optional(), sku: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(160), price: z.coerce.number().finite().min(0),
  inventoryCount: z.coerce.number().int().min(0),
  options: z.record(z.string().trim().min(1).max(60), z.string().trim().min(1).max(80)).refine((value) => Object.keys(value).length > 0),
  isActive: z.boolean().optional(),
}).strict();
const imageSchema = z.object({ assetRef: z.string().min(1).max(2048), isFeatured: z.boolean().optional(), sortOrder: z.number().int().min(0).max(100).optional() }).strict();
const productFields = {
  name: z.string().trim().min(2).max(200), slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  brand: z.string().trim().max(120).optional(), description: z.string().trim().max(10_000).optional(),
  basePrice: z.coerce.number().finite().min(0), compareAtPrice: z.coerce.number().finite().min(0).optional(),
  categoryId: z.string().uuid().optional(), subCategoryId: z.string().uuid().optional(),
  inventoryCount: z.coerce.number().int().min(0).optional(), status: z.enum(["DRAFT", "PUBLISHED", "ACTIVE", "ARCHIVED", "OUT_OF_STOCK"]).optional(),
  sizes: z.array(z.string().trim().min(1).max(60)).max(50).optional(), colors: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
  specs: z.array(z.record(z.string().trim().min(1).max(100), z.string().trim().max(500))).max(50).optional(), tags: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
  images: z.array(imageSchema).min(1).max(12).optional(), variants: z.array(variantSchema).max(100).optional(),
};
export const vendorProductCreateSchema = z.object(productFields).strict().superRefine((value, context) => {
  if (value.compareAtPrice !== undefined && value.compareAtPrice < value.basePrice) context.addIssue({ code: z.ZodIssueCode.custom, path: ["compareAtPrice"], message: "Compare-at price must not be lower than the selling price." });
});
export const vendorProductPatchSchema = z.object({ ...productFields, name: productFields.name.optional(), slug: productFields.slug.optional(), basePrice: productFields.basePrice.optional() }).strict().superRefine((value, context) => {
  if (value.compareAtPrice !== undefined && value.basePrice !== undefined && value.compareAtPrice < value.basePrice) context.addIssue({ code: z.ZodIssueCode.custom, path: ["compareAtPrice"], message: "Compare-at price must not be lower than the selling price." });
});
export const inventoryQuerySchema = z.object({ q: z.string().trim().max(120).optional(), lowStockOnly: z.enum(["true", "false"]).optional() });
export const inventoryAdjustmentSchema = z.object({ productId: z.string().uuid(), variantId: z.string().uuid().optional(), operation: z.enum(["INCREMENT", "DECREMENT", "SET"]), quantity: z.number().int().min(0).max(1_000_000), reason: z.enum(["RESTOCK", "CORRECTION", "DAMAGE", "RETURN", "OTHER"]) }).strict().superRefine((value, context) => {
  if (value.operation !== "SET" && value.quantity < 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "Quantity must be greater than zero." });
});
export const analyticsPeriodSchema = z.enum(["TODAY", "7D", "30D"]);
