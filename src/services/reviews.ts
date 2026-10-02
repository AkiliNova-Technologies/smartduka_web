import { Prisma, ReviewStatus, SubOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { requireActiveUserId } from "@/lib/auth/session";
import { requireAdminContext } from "@/lib/auth/admin-context";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { cacheLife, cacheTag } from "next/cache";
import { cacheProfiles, cacheTags } from "@/lib/cache-policy";

const PUBLISHED: ReviewStatus = "PUBLISHED";
const MAX_COMMENT = 2_000;
const MAX_TITLE = 120;
const MAX_IMAGES = 5;

export class ReviewError extends Error {
  constructor(message: string, public readonly code: "INVALID" | "INELIGIBLE" | "FORBIDDEN" | "DUPLICATE" | "NOT_FOUND" = "INVALID") { super(message); this.name = "ReviewError"; }
}

export type ProductReviewInput = { orderItemId: string; rating: number; title?: string; comment?: string; imageUrls?: string[] };
export type ShopReviewInput = { subOrderId: string; rating: number; comment?: string };
export type EligibleReviewPurchase = {
  id: string;
  variantName: string | null;
  existing: { id: string; rating: number; title?: string | null; comment: string | null; imageUrls?: string[] } | null;
};

function text(value: unknown, max: number, field: string, required = false) {
  if (value == null) { if (required) throw new ReviewError(`${field} is required.`); return null; }
  if (typeof value !== "string") throw new ReviewError(`Invalid ${field.toLowerCase()}.`);
  const result = value.trim();
  if (required && !result) throw new ReviewError(`${field} is required.`);
  if (result.length > max) throw new ReviewError(`${field} must be ${max} characters or fewer.`);
  return result || null;
}
function rating(value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 5) throw new ReviewError("Rating must be a whole number from 1 to 5.");
  return Number(value);
}
function images(value: unknown) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > MAX_IMAGES || value.some((url) => typeof url !== "string" || url.length > 2_048 || !/^https:\/\//.test(url))) throw new ReviewError("Up to five valid review image URLs are allowed.");
  return [...new Set(value)];
}
/** The only qualifying purchase policy: paid order + delivered vendor sub-order.
 * Cancelled/refunded sub-orders and fully-refunded orders never qualify. */
function isQualifyingPurchase(order: { paymentStatus: string; status: string }, subOrder: { status: SubOrderStatus }) {
  return order.paymentStatus === "COMPLETED" && order.status !== "REFUNDED" && subOrder.status === "DELIVERED";
}

export class ReviewService {
  static async eligibleProductPurchasesForCurrentUser(productId: string): Promise<EligibleReviewPurchase[]> {
    const userId = await requireActiveUserId();
    const items = await prisma.orderItem.findMany({
      where: { productId, order: { customerId: userId, paymentStatus: "COMPLETED", status: { not: "REFUNDED" } }, subOrder: { status: "DELIVERED" } },
      select: { id: true, variantNameSnapshot: true, productReview: { select: { id: true, rating: true, title: true, comment: true, imageUrls: true } } },
      orderBy: { order: { createdAt: "desc" } },
    });
    return items.map((item) => ({ id: item.id, variantName: item.variantNameSnapshot, existing: item.productReview }));
  }

  static async eligibleShopPurchasesForCurrentUser(vendorId: string): Promise<EligibleReviewPurchase[]> {
    const userId = await requireActiveUserId();
    const subOrders = await prisma.subOrder.findMany({
      where: { vendorId, status: "DELIVERED", order: { customerId: userId, paymentStatus: "COMPLETED", status: { not: "REFUNDED" } } },
      select: { id: true, shopReview: { select: { id: true, rating: true, comment: true } } },
      orderBy: { order: { createdAt: "desc" } },
    });
    return subOrders.map((subOrder) => ({ id: subOrder.id, variantName: null, existing: subOrder.shopReview }));
  }

  static async createProductReviewForCurrentUser(input: ProductReviewInput) {
    const userId = await requireActiveUserId();
    const clean = { rating: rating(input.rating), title: text(input.title, MAX_TITLE, "Title"), comment: text(input.comment, MAX_COMMENT, "Review"), imageUrls: images(input.imageUrls) };
    return prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findFirst({ where: { id: input.orderItemId, order: { customerId: userId } }, include: { order: { select: { paymentStatus: true, status: true } }, subOrder: { select: { status: true, vendorId: true } } } });
      if (!item || !isQualifyingPurchase(item.order, item.subOrder)) throw new ReviewError("This purchase is not eligible for a review.", "INELIGIBLE");
      const existing = await tx.productReview.findUnique({ where: { orderItemId: item.id }, select: { id: true } });
      if (existing) throw new ReviewError("This order item has already been reviewed.", "DUPLICATE");
      try {
        return await tx.productReview.create({ data: { productId: item.productId, userId, orderItemId: item.id, variantId: item.variantId, verifiedPurchase: true, status: PUBLISHED, ...clean } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ReviewError("This order item has already been reviewed.", "DUPLICATE");
        throw error;
      }
    });
  }

  static async createShopReviewForCurrentUser(input: ShopReviewInput) {
    const userId = await requireActiveUserId(); const clean = { rating: rating(input.rating), comment: text(input.comment, MAX_COMMENT, "Review") };
    return prisma.$transaction(async (tx) => {
      const subOrder = await tx.subOrder.findFirst({ where: { id: input.subOrderId, order: { customerId: userId } }, include: { order: { select: { paymentStatus: true, status: true } } } });
      if (!subOrder || !isQualifyingPurchase(subOrder.order, subOrder)) throw new ReviewError("This shop purchase is not eligible for a review.", "INELIGIBLE");
      try { return await tx.shopReview.create({ data: { vendorId: subOrder.vendorId, userId, subOrderId: subOrder.id, status: PUBLISHED, ...clean } }); }
      catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ReviewError("This shop transaction has already been reviewed.", "DUPLICATE"); throw error; }
    });
  }

  static async updateProductReviewForCurrentUser(id: string, input: Omit<ProductReviewInput, "orderItemId">) {
    const userId = await requireActiveUserId();
    const existing = await prisma.productReview.findFirst({ where: { id, userId } }); if (!existing) throw new ReviewError("Review not found.", "NOT_FOUND");
    return prisma.productReview.update({ where: { id }, data: { rating: rating(input.rating), title: text(input.title, MAX_TITLE, "Title"), comment: text(input.comment, MAX_COMMENT, "Review"), imageUrls: images(input.imageUrls) } });
  }
  static async updateShopReviewForCurrentUser(id: string, input: Omit<ShopReviewInput, "subOrderId">) {
    const userId = await requireActiveUserId(); const existing = await prisma.shopReview.findFirst({ where: { id, userId } }); if (!existing) throw new ReviewError("Review not found.", "NOT_FOUND");
    return prisma.shopReview.update({ where: { id }, data: { rating: rating(input.rating), comment: text(input.comment, MAX_COMMENT, "Review") } });
  }
  static async deleteOwnReview(kind: "product" | "shop", id: string) {
    const userId = await requireActiveUserId();
    const result = kind === "product" ? await prisma.productReview.deleteMany({ where: { id, userId } }) : await prisma.shopReview.deleteMany({ where: { id, userId } });
    if (!result.count) throw new ReviewError("Review not found.", "NOT_FOUND");
  }

  static async productSummary(productId: string) {
    const grouped = await prisma.productReview.groupBy({ by: ["rating"], where: { productId, status: PUBLISHED }, _count: { _all: true }, _avg: { rating: true } });
    const count = grouped.reduce((n, row) => n + row._count._all, 0); const sum = grouped.reduce((n, row) => n + row.rating * row._count._all, 0);
    return { average: count ? Number((sum / count).toFixed(1)) : 0, count, distribution: [5,4,3,2,1].map((value) => ({ rating: value, count: grouped.find((row) => row.rating === value)?._count._all ?? 0 })) };
  }
  static async shopSummary(vendorId: string) {
    const grouped = await prisma.shopReview.groupBy({ by: ["rating"], where: { vendorId, status: PUBLISHED }, _count: { _all: true } });
    const count = grouped.reduce((n, row) => n + row._count._all, 0); const sum = grouped.reduce((n, row) => n + row.rating * row._count._all, 0);
    return { average: count ? Number((sum / count).toFixed(1)) : 0, count, distribution: [5,4,3,2,1].map((value) => ({ rating: value, count: grouped.find((row) => row.rating === value)?._count._all ?? 0 })) };
  }
  static async publicProductReviews(productId: string, minRating?: number) { return prisma.productReview.findMany({ where: { productId, status: PUBLISHED, ...(minRating ? { rating: minRating } : {}) }, include: { user: { select: { name: true, avatarUrl: true } }, variant: { select: { name: true } }, vendorReplies: { select: { body: true, createdAt: true } } }, orderBy: { createdAt: "desc" }, take: 100 }); }
  static async publicShopReviews(vendorId: string) { return prisma.shopReview.findMany({ where: { vendorId, status: PUBLISHED }, include: { user: { select: { name: true, avatarUrl: true } }, vendorReplies: { select: { body: true, createdAt: true } } }, orderBy: { createdAt: "desc" }, take: 100 }); }
  static async listForCurrentVendor() {
    const context = await requireVendorContext("vendor:manage_shop");
    return this.listForVendor(context.vendorId);
  }
  /** Authorization happens before this cache boundary. Never call with browser-supplied identity. */
  static async listForVendor(vendorId: string) {
    "use cache";
    cacheLife(cacheProfiles.vendorOperational);
    cacheTag(cacheTags.vendorReviews(vendorId));
    const [productReviews, shopReviews] = await Promise.all([
      prisma.productReview.findMany({ where: { product: { vendorId } }, include: { product: { select: { name: true, images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 } } }, user: { select: { name: true } }, vendorReplies: { select: { body: true, createdAt: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.shopReview.findMany({ where: { vendorId }, include: { user: { select: { name: true } }, vendorReplies: { select: { body: true, createdAt: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    ]);
    return { productReviews, shopReviews };
  }

  static async replyForCurrentVendor(kind: "product" | "shop", reviewId: string, body: unknown) {
    const context = await requireVendorContext("vendor:manage_shop"); const clean = text(body, MAX_COMMENT, "Reply", true)!;
    const review = kind === "product" ? await prisma.productReview.findFirst({ where: { id: reviewId, product: { vendorId: context.vendorId } } }) : await prisma.shopReview.findFirst({ where: { id: reviewId, vendorId: context.vendorId } });
    if (!review) throw new ReviewError("Review not found.", "NOT_FOUND");
    const reply = await prisma.reviewReply.upsert({ where: kind === "product" ? { productReviewId: reviewId } : { shopReviewId: reviewId }, create: { vendorId: context.vendorId, userId: context.user.id, body: clean, ...(kind === "product" ? { productReviewId: reviewId } : { shopReviewId: reviewId }) }, update: { body: clean, userId: context.user.id } });
    const { updateTag } = await import("next/cache");
    updateTag(cacheTags.vendorReviews(context.vendorId));
    return reply;
  }
  static async reportForCurrentUser(kind: "product" | "shop", reviewId: string, reason: unknown) {
    const userId = await requireActiveUserId(); const clean = text(reason, 1_000, "Report reason", true)!;
    try { return await prisma.reviewReport.create({ data: { reporterId: userId, reason: clean, ...(kind === "product" ? { productReviewId: reviewId } : { shopReviewId: reviewId }) } }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ReviewError("You have already reported this review.", "DUPLICATE"); throw error; }
  }
  static async moderateForCurrentAdmin(kind: "product" | "shop", id: string, status: ReviewStatus) {
    const admin = await requireAdminContext("platform:customer_support"); if (!["PUBLISHED", "HIDDEN", "REMOVED"].includes(status)) throw new ReviewError("Invalid moderation status.");
    const result = kind === "product" ? await prisma.productReview.updateMany({ where: { id }, data: { status } }) : await prisma.shopReview.updateMany({ where: { id }, data: { status } }); if (!result.count) throw new ReviewError("Review not found.", "NOT_FOUND");
    await prisma.$transaction([
      prisma.auditLog.create({ data: { userId: admin.userId, action: "REVIEW_MODERATED", entity: `${kind.toUpperCase()}_REVIEW`, entityId: id, newValues: { status } } }),
      prisma.reviewReport.updateMany({ where: kind === "product" ? { productReviewId: id, status: "OPEN" } : { shopReviewId: id, status: "OPEN" }, data: { status: "RESOLVED", resolvedById: admin.userId, resolution: `Review moderation: ${status}` } }),
    ]);
  }
}
