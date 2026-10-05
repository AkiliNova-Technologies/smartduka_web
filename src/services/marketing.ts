import { Prisma, ProductStatus, PromotionCtaType, PromotionPlacement, PromotionStatus, VendorStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { requireAdminContext } from "@/lib/auth/admin-context";
import { cacheLife, cacheTag } from "next/cache";
import { cacheProfiles, cacheTags } from "@/lib/cache-policy";
import { serializePublicShopListing, type PublicShopListing } from "@/lib/public-shop-dto";

export type PromotionInput = {
  title: string; subtitle?: string | null; desktopImageUrl: string; mobileImageUrl?: string | null;
  status?: PromotionStatus; priority?: number; startsAt?: string | null; endsAt?: string | null;
  placements: PromotionPlacement[];
  primaryCtaLabel?: string | null; primaryCtaType?: PromotionCtaType | null; primaryCtaValue?: string | null;
  secondaryCtaLabel?: string | null; secondaryCtaType?: PromotionCtaType | null; secondaryCtaValue?: string | null;
};

const internalPath = (value: string) => value.startsWith("/") && !value.startsWith("//") && !/[\\\r\n]/.test(value);
const externalUrl = (value: string) => { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } };
const parseDate = (value?: string | null) => value ? new Date(value) : null;
const validDate = (value: Date | null) => !value || !Number.isNaN(value.valueOf());
export const FEATURED_PRIORITY_STEP = 100;

export class MarketingError extends Error {
  constructor(message: string, public readonly code: "INVALID_FEATURED_REORDER" | "UNKNOWN_FEATURED_ITEM" | "DUPLICATE_FEATURED_ID" | "FEATURED_ORDER_CONFLICT") { super(message); }
}

export class PromotionValidationError extends Error {
  constructor(message: string, public readonly code: string, public readonly errors?: Record<string, string>) { super(message); }
}

const featuredOrder = [{ priority: "asc" as const }, { createdAt: "asc" as const }, { id: "asc" as const }];
const isKnownPrismaError = (error: unknown, code: string) => typeof error === "object" && error !== null && "code" in error && error.code === code;
function validateOrderedIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id.trim())) throw new MarketingError("orderedIds must be an array of featured record IDs.", "INVALID_FEATURED_REORDER");
  const orderedIds = value.map((id) => id.trim());
  if (new Set(orderedIds).size !== orderedIds.length) throw new MarketingError("Featured items cannot be repeated in an order.", "DUPLICATE_FEATURED_ID");
  return orderedIds;
}
function validateFeaturedSet(orderedIds: string[], currentIds: string[]) {
  const current = new Set(currentIds);
  if (orderedIds.some((id) => !current.has(id))) throw new MarketingError("One or more featured items no longer exist.", "UNKNOWN_FEATURED_ITEM");
  if (orderedIds.length !== currentIds.length) throw new MarketingError("The featured list changed. Refresh and try again.", "FEATURED_ORDER_CONFLICT");
}

async function resolveCta(type?: PromotionCtaType | null, value?: string | null) {
  if (!type || !value) return null;
  if (type === "INTERNAL_PATH") return internalPath(value) ? value : null;
  if (type === "EXTERNAL_URL") return externalUrl(value) ? value : null;
  if (type === "PRODUCT") { const p = await prisma.product.findFirst({ where: { id: value, status: { in: [ProductStatus.ACTIVE, ProductStatus.PUBLISHED] }, deletedAt: null, vendor: { status: VendorStatus.ACTIVE, deletedAt: null } }, select: { slug: true } }); return p ? `/products/${p.slug}` : null; }
  if (type === "SHOP") { const v = await prisma.vendorProfile.findFirst({ where: { id: value, status: VendorStatus.ACTIVE, deletedAt: null }, select: { slug: true } }); return v ? `/shops/${v.slug}` : null; }
  const c = await prisma.productCategory.findFirst({ where: { id: value, isActive: true }, select: { slug: true } }); return c ? `/categories/${c.slug}` : null;
}

async function validateCta(type: PromotionCtaType | null | undefined, value: string | null | undefined, label: string | null | undefined, field: "primaryCta" | "secondaryCta") {
  if (!type && !value && !label) return;
  if (!type || !value || !label?.trim() || !(await resolveCta(type, value))) {
    throw new PromotionValidationError("Each CTA needs a label and a safe, valid destination.", "INVALID_PROMOTION_CTA", { [field]: "Choose a CTA type, label, and valid destination, or clear the CTA." });
  }
}

export class MarketingService {
  static async adminList() { await requireAdminContext("platform:manage"); return prisma.promotion.findMany({ orderBy: [{ priority: "asc" }, { createdAt: "desc" }] }); }
  static async savePromotion(input: PromotionInput, id?: string) {
    const admin = await requireAdminContext("platform:manage");
    if (!input.title.trim() || !input.desktopImageUrl.trim() || !input.placements.length) throw new Error("Title, desktop image, and at least one placement are required.");
    if (!Object.values(PromotionStatus).includes(input.status ?? "DRAFT") || input.placements.some((p) => !Object.values(PromotionPlacement).includes(p))) throw new Error("Invalid promotion settings.");
    const startsAt = parseDate(input.startsAt), endsAt = parseDate(input.endsAt);
    if (!validDate(startsAt) || !validDate(endsAt) || (startsAt && endsAt && startsAt >= endsAt)) throw new Error("Scheduling dates are invalid.");
    await validateCta(input.primaryCtaType, input.primaryCtaValue, input.primaryCtaLabel, "primaryCta");
    await validateCta(input.secondaryCtaType, input.secondaryCtaValue, input.secondaryCtaLabel, "secondaryCta");
    const data = { ...input, title: input.title.trim(), subtitle: input.subtitle?.trim() || null, desktopImageUrl: input.desktopImageUrl.trim(), mobileImageUrl: input.mobileImageUrl?.trim() || null, startsAt, endsAt, priority: Number.isFinite(input.priority) ? Math.trunc(input.priority!) : 100, primaryCtaLabel: input.primaryCtaLabel?.trim() || null, secondaryCtaLabel: input.secondaryCtaLabel?.trim() || null };
    return id ? prisma.promotion.update({ where: { id }, data: { ...data, updatedByUserId: admin.userId } }) : prisma.promotion.create({ data: { ...data, createdByUserId: admin.userId } });
  }
  static async setPromotionStatus(id: string, status: PromotionStatus) { await requireAdminContext("platform:manage"); return prisma.promotion.update({ where: { id }, data: { status } }); }
  static async featuredProducts() { await requireAdminContext("platform:manage"); return prisma.featuredProduct.findMany({ include: { product: { include: { vendor: true, images: { take: 1 } } } }, orderBy: featuredOrder }); }
  static async featuredShops() { await requireAdminContext("platform:manage"); return prisma.featuredShop.findMany({ include: { vendor: { include: { _count: { select: { products: true } } } } }, orderBy: featuredOrder }); }
  static async saveFeatured(kind: "product" | "shop", entityId: string, priority?: number, isActive = true, startsAt?: string | null, endsAt?: string | null) {
    const admin = await requireAdminContext("platform:manage"); const dates = { startsAt: parseDate(startsAt), endsAt: parseDate(endsAt) }; if (!validDate(dates.startsAt) || !validDate(dates.endsAt) || (dates.startsAt && dates.endsAt && dates.startsAt >= dates.endsAt)) throw new Error("Scheduling dates are invalid.");
    if (kind === "product") { const product = await prisma.product.findFirst({ where: { id: entityId, status: { in: [ProductStatus.ACTIVE, ProductStatus.PUBLISHED] }, deletedAt: null } }); if (!product) throw new Error("Choose an active product."); return prisma.$transaction(async (tx) => { const existing = await tx.featuredProduct.findUnique({ where: { productId: entityId } }); if (existing) return tx.featuredProduct.update({ where: { id: existing.id }, data: { ...(Number.isInteger(priority) ? { priority } : {}), isActive, ...dates } }); const max = await tx.featuredProduct.aggregate({ _max: { priority: true } }); return tx.featuredProduct.create({ data: { productId: entityId, priority: (max._max.priority ?? 0) + FEATURED_PRIORITY_STEP, isActive, createdByUserId: admin.userId, ...dates } }); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    const vendor = await prisma.vendorProfile.findFirst({ where: { id: entityId, status: VendorStatus.ACTIVE } }); if (!vendor) throw new Error("Choose an active shop."); return prisma.$transaction(async (tx) => { const existing = await tx.featuredShop.findUnique({ where: { vendorId: entityId } }); if (existing) return tx.featuredShop.update({ where: { id: existing.id }, data: { ...(Number.isInteger(priority) ? { priority } : {}), isActive, ...dates } }); const max = await tx.featuredShop.aggregate({ _max: { priority: true } }); return tx.featuredShop.create({ data: { vendorId: entityId, priority: (max._max.priority ?? 0) + FEATURED_PRIORITY_STEP, isActive, createdByUserId: admin.userId, ...dates } }); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  static async reorderFeaturedProducts(input: unknown) { await requireAdminContext("platform:manage"); const orderedIds = validateOrderedIds(input); try { return await prisma.$transaction(async (tx) => { const current = await tx.featuredProduct.findMany({ select: { id: true }, orderBy: featuredOrder }); validateFeaturedSet(orderedIds, current.map((item) => item.id)); await Promise.all(orderedIds.map((id, index) => tx.featuredProduct.update({ where: { id }, data: { priority: (index + 1) * FEATURED_PRIORITY_STEP } }))); return tx.featuredProduct.findMany({ include: { product: { include: { vendor: true, images: { take: 1 } } } }, orderBy: featuredOrder }); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); } catch (error) { if (isKnownPrismaError(error, "P2034")) throw new MarketingError("The featured list changed. Refresh and try again.", "FEATURED_ORDER_CONFLICT"); throw error; } }
  static async reorderFeaturedShops(input: unknown) { await requireAdminContext("platform:manage"); const orderedIds = validateOrderedIds(input); try { return await prisma.$transaction(async (tx) => { const current = await tx.featuredShop.findMany({ select: { id: true }, orderBy: featuredOrder }); validateFeaturedSet(orderedIds, current.map((item) => item.id)); await Promise.all(orderedIds.map((id, index) => tx.featuredShop.update({ where: { id }, data: { priority: (index + 1) * FEATURED_PRIORITY_STEP } }))); return tx.featuredShop.findMany({ include: { vendor: { include: { _count: { select: { products: true } } } } }, orderBy: featuredOrder }); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); } catch (error) { if (isKnownPrismaError(error, "P2034")) throw new MarketingError("The featured list changed. Refresh and try again.", "FEATURED_ORDER_CONFLICT"); throw error; } }
  static async removeFeatured(kind: "product" | "shop", id: string) { await requireAdminContext("platform:manage"); return kind === "product" ? prisma.featuredProduct.delete({ where: { id } }) : prisma.featuredShop.delete({ where: { id } }); }
  static async pickerData() { await requireAdminContext("platform:manage"); const [products, shops, categories] = await Promise.all([prisma.product.findMany({ where: { status: { in: [ProductStatus.ACTIVE, ProductStatus.PUBLISHED] }, deletedAt: null }, select: { id: true, name: true, slug: true }, take: 100, orderBy: { name: "asc" } }), prisma.vendorProfile.findMany({ where: { status: VendorStatus.ACTIVE }, select: { id: true, storeName: true, slug: true }, take: 100, orderBy: { storeName: "asc" } }), prisma.productCategory.findMany({ select: { id: true, name: true, slug: true }, take: 100, orderBy: { name: "asc" } })]); return { products, shops, categories }; }
  static async publicPromotions(placement: PromotionPlacement) { "use cache"; cacheLife(cacheProfiles.promotions); cacheTag(cacheTags.marketplace.promotions, cacheTags.marketplace.promotionPlacement(placement)); const now = new Date(); const rows = await prisma.promotion.findMany({ where: { status: "ACTIVE", placements: { has: placement }, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] }, orderBy: [{ priority: "asc" }, { createdAt: "desc" }], take: 5 }); const promotions = await Promise.all(rows.map(async (p) => { const primaryHref = await resolveCta(p.primaryCtaType, p.primaryCtaValue); if (p.primaryCtaType && !primaryHref) return null; return { id: p.id, title: p.title, subtitle: p.subtitle, desktopImageUrl: p.desktopImageUrl, mobileImageUrl: p.mobileImageUrl, primaryCtaLabel: p.primaryCtaLabel, primaryHref, secondaryCtaLabel: p.secondaryCtaLabel, secondaryHref: await resolveCta(p.secondaryCtaType, p.secondaryCtaValue) }; })); return promotions.filter((promotion): promotion is NonNullable<typeof promotion> => promotion !== null); }
  static async publicFeaturedProducts() { "use cache"; cacheLife(cacheProfiles.promotions); cacheTag(cacheTags.marketplace.promotions, cacheTags.marketplace.discovery); const now = new Date(); const rows = await prisma.featuredProduct.findMany({ where: { isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }], product: { status: { in: [ProductStatus.ACTIVE, ProductStatus.PUBLISHED] }, deletedAt: null } }, include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, vendor: true, category: true } } }, orderBy: featuredOrder }); return rows.map(({ product }) => ({ id: product.id, name: product.name, slug: product.slug, brand: product.brand, basePrice: Number(product.basePrice), compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null, inventoryCount: product.inventoryCount, image: product.images[0]?.url ?? "", vendorId: product.vendorId, vendorName: product.vendor.storeName, category: product.category })); }
  static async publicFeaturedShops(): Promise<PublicShopListing[]> { "use cache"; cacheLife(cacheProfiles.promotions); cacheTag(cacheTags.marketplace.promotions, cacheTags.marketplace.discovery, cacheTags.marketplace.shops); const now = new Date(); const rows = await prisma.featuredShop.findMany({ where: { isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }], vendor: { status: VendorStatus.ACTIVE, deletedAt: null } }, select: { vendor: { select: { id: true, storeName: true, slug: true, logoUrl: true, bannerUrl: true, description: true, city: true, country: true, verificationStatus: true, fulfillmentMethods: true, deliveryFee: true, deliveryEstimate: true, _count: { select: { products: { where: { status: { in: [ProductStatus.ACTIVE, ProductStatus.PUBLISHED] }, deletedAt: null } } } } } } }, orderBy: featuredOrder, take: 4 }); return rows.map(({ vendor }) => serializePublicShopListing(vendor)); }
}
