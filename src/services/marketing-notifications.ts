import {
  AnnouncementStatus,
  MarketingDestinationType,
  MarketingNotificationAudience,
  MarketingNotificationCategory,
  Prisma,
  ProductStatus,
  UserStatus,
  VendorStatus,
} from "@prisma/client";
import { requireAdminContext } from "@/lib/auth/admin-context";
import { prisma } from "@/lib/prisma/client";
import { MARKETING_DAILY_LIMIT } from "@/lib/marketing-notification-policy";
import { eligibleMarketingAudiences, marketingSettingsWhere } from "@/lib/marketing-campaign-eligibility";

export class MarketingNotificationError extends Error {
  constructor(message: string, public code = "VALIDATION_ERROR") { super(message); }
}

export interface MarketingCampaignInput {
  name: string; title: string; message: string;
  category: MarketingNotificationCategory;
  audience: MarketingNotificationAudience;
  destinationType: MarketingDestinationType;
  destinationReference?: string | null;
  imageUrl?: string | null;
  scheduledAt?: string | null;
  expiresAt?: string | null;
  pushEnabled?: boolean;
}

export interface MarketingCampaignListInput {
  status?: AnnouncementStatus;
  page: number;
  pageSize: number;
  search?: string;
}

export interface MarketingDestinationOptionsInput {
  query?: string;
  type?: MarketingDestinationType;
}

const campaignSelect = { id: true, name: true, title: true, message: true, category: true, audience: true, destinationType: true, destinationReference: true, destinationPath: true, imageUrl: true, pushEnabled: true, status: true, scheduledAt: true, publishedAt: true, expiresAt: true, createdAt: true, updatedAt: true, pushDispatch: { select: { status: true, processedRecipients: true, eligibleRecipients: true, queuedJobs: true } }, createdBy: { select: { id: true, name: true } }, publishedBy: { select: { id: true, name: true } } } satisfies Prisma.MarketingNotificationCampaignSelect;
const clean = (value: unknown, max: number, label: string) => { const result = typeof value === "string" ? value.trim().replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ") : ""; if (!result) throw new MarketingNotificationError(`${label} is required.`); if (result.length > max) throw new MarketingNotificationError(`${label} must be ${max} characters or fewer.`); return result; };
const optionalDate = (value: string | null | undefined, label: string) => { if (!value) return null; const parsed = new Date(value); if (Number.isNaN(parsed.valueOf())) throw new MarketingNotificationError(`${label} is invalid.`); return parsed; };

export async function resolveMarketingDestination(type: MarketingDestinationType, reference?: string | null) {
  if (type === MarketingDestinationType.HOME) return { reference: null, path: "/", label: "Mwezora homepage" };
  if (type === MarketingDestinationType.FEATURED_SECTION) {
    const sections: Record<string, { path: string; label: string }> = { DEALS: { path: "/deals", label: "Deals" }, NEW_ARRIVALS: { path: "/new-arrivals", label: "New arrivals" }, FEATURED_PRODUCTS: { path: "/?section=featured-products", label: "Featured products" }, FEATURED_SHOPS: { path: "/?section=featured-shops", label: "Featured shops" } };
    const section = reference ? sections[reference] : null; if (!section) throw new MarketingNotificationError("Choose a supported marketplace section."); return { reference, ...section };
  }
  if (!reference) throw new MarketingNotificationError("Choose a marketplace destination.");
  if (type === MarketingDestinationType.PRODUCT) { const row = await prisma.product.findFirst({ where: { id: reference, status: { in: [ProductStatus.PUBLISHED, ProductStatus.ACTIVE] }, deletedAt: null, vendor: { status: VendorStatus.ACTIVE, deletedAt: null } }, select: { id: true, slug: true, name: true } }); if (!row) throw new MarketingNotificationError("Choose a published product from an active shop."); return { reference: row.id, path: `/products/${row.slug}`, label: row.name }; }
  if (type === MarketingDestinationType.SHOP) { const row = await prisma.vendorProfile.findFirst({ where: { id: reference, status: VendorStatus.ACTIVE, deletedAt: null }, select: { id: true, slug: true, storeName: true } }); if (!row) throw new MarketingNotificationError("Choose an active shop."); return { reference: row.id, path: `/shops/${row.slug}`, label: row.storeName }; }
  if (type === MarketingDestinationType.CATEGORY) { const row = await prisma.productCategory.findFirst({ where: { id: reference, isActive: true }, select: { id: true, slug: true, name: true } }); if (!row) throw new MarketingNotificationError("Choose an active category."); return { reference: row.id, path: `/categories/${row.slug}`, label: row.name }; }
  throw new MarketingNotificationError("Choose a supported destination type.");
}

async function validated(input: MarketingCampaignInput, now = new Date()) {
  if (!Object.values(MarketingNotificationCategory).includes(input.category)) throw new MarketingNotificationError("Choose a valid campaign category.");
  if (!Object.values(MarketingNotificationAudience).includes(input.audience)) throw new MarketingNotificationError("Choose a valid consent-based audience.");
  if (!Object.values(MarketingDestinationType).includes(input.destinationType)) throw new MarketingNotificationError("Choose a valid destination type.");
  const scheduledAt = optionalDate(input.scheduledAt, "Publication time"), expiresAt = optionalDate(input.expiresAt, "Expiration time");
  if (scheduledAt && expiresAt && expiresAt <= scheduledAt) throw new MarketingNotificationError("Expiration must be after publication.");
  if (expiresAt && expiresAt <= now) throw new MarketingNotificationError("Expiration must be in the future.");
  const destination = await resolveMarketingDestination(input.destinationType, input.destinationReference);
  const imageUrl = input.imageUrl?.trim() || null;
  if (imageUrl && (!imageUrl.startsWith("/") || imageUrl.startsWith("//") || imageUrl.length > 1000)) throw new MarketingNotificationError("Campaign imagery must use a safe Mwezora asset path.");
  return { name: clean(input.name, 160, "Campaign name"), title: clean(input.title, 160, "Notification title"), message: clean(input.message, 2000, "Notification message"), category: input.category, audience: input.audience, destinationType: input.destinationType, destinationReference: destination.reference, destinationPath: destination.path, imageUrl, pushEnabled: input.pushEnabled === true, scheduledAt, expiresAt };
}

async function eligibleAudiencesForUser(userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, status: UserStatus.ACTIVE, deletedAt: null }, select: { settings: { select: { promotionalInAppNotifications: true, shoppingRecommendations: true } } } });
  return eligibleMarketingAudiences(user?.settings);
}

export class MarketingNotificationService {
  static async adminList(input: MarketingCampaignListInput) {
    await requireAdminContext("platform:manage_announcements");
    const search = input.search?.trim();
    const where: Prisma.MarketingNotificationCampaignWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } },
          { message: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    };
    const [campaigns, total] = await Promise.all([
      prisma.marketingNotificationCampaign.findMany({
        where,
        select: campaignSelect,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.marketingNotificationCampaign.count({ where }),
    ]);
    const deliveryCounts = await prisma.pushDeliveryOutbox.groupBy({ by: ["marketingCampaignId", "status"], where: { marketingCampaignId: { in: campaigns.map(({ id }) => id) } }, _count: { _all: true } });
    return { campaigns: campaigns.map((campaign) => ({ ...campaign, pushDelivery: Object.fromEntries(deliveryCounts.filter((row) => row.marketingCampaignId === campaign.id).map((row) => [row.status, row._count._all])) })), total, page: input.page, pageSize: input.pageSize };
  }
  static async destinationOptions(input: MarketingDestinationOptionsInput = {}) {
    await requireAdminContext("platform:manage_announcements");
    const query = input.query?.trim();
    const limit = 50;
    const productWhere: Prisma.ProductWhereInput = {
      status: { in: [ProductStatus.PUBLISHED, ProductStatus.ACTIVE] },
      deletedAt: null,
      vendor: { status: VendorStatus.ACTIVE, deletedAt: null },
      ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { vendor: { storeName: { contains: query, mode: "insensitive" } } }] } : {}),
    };
    const shopWhere: Prisma.VendorProfileWhereInput = {
      status: VendorStatus.ACTIVE,
      deletedAt: null,
      ...(query ? { OR: [{ storeName: { contains: query, mode: "insensitive" } }, { city: { contains: query, mode: "insensitive" } }] } : {}),
    };
    const categoryWhere: Prisma.ProductCategoryWhereInput = {
      isActive: true,
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    };
    const [products, shops, categories] = await Promise.all([
      !input.type || input.type === MarketingDestinationType.PRODUCT ? prisma.product.findMany({ where: productWhere, select: { id: true, name: true, vendor: { select: { storeName: true } } }, orderBy: { name: "asc" }, take: limit }) : Promise.resolve([]),
      !input.type || input.type === MarketingDestinationType.SHOP ? prisma.vendorProfile.findMany({ where: shopWhere, select: { id: true, storeName: true, city: true }, orderBy: { storeName: "asc" }, take: limit }) : Promise.resolve([]),
      !input.type || input.type === MarketingDestinationType.CATEGORY ? prisma.productCategory.findMany({ where: categoryWhere, select: { id: true, name: true }, orderBy: { name: "asc" }, take: limit }) : Promise.resolve([]),
    ]);
    return { products: products.map((row) => ({ id: row.id, label: row.name, description: row.vendor.storeName })), shops: shops.map((row) => ({ id: row.id, label: row.storeName, description: row.city ?? undefined })), categories: categories.map((row) => ({ id: row.id, label: row.name })), sections: input.type && input.type !== MarketingDestinationType.FEATURED_SECTION ? [] : [{ id: "DEALS", label: "Deals" }, { id: "NEW_ARRIVALS", label: "New arrivals" }, { id: "FEATURED_PRODUCTS", label: "Featured products" }, { id: "FEATURED_SHOPS", label: "Featured shops" }] };
  }
  static async audienceEstimate(audience: MarketingNotificationAudience) { await requireAdminContext("platform:manage_announcements"); return prisma.user.count({ where: { status: UserStatus.ACTIVE, deletedAt: null, settings: marketingSettingsWhere(audience, false) } }); }
  static async create(input: MarketingCampaignInput) { const actor = await requireAdminContext("platform:manage_announcements"), data = await validated(input); return prisma.$transaction(async (tx) => { const row = await tx.marketingNotificationCampaign.create({ data: { ...data, createdById: actor.userId }, select: campaignSelect }); await tx.auditLog.create({ data: { userId: actor.userId, action: "MARKETING_NOTIFICATION_CREATED", entity: "MarketingNotificationCampaign", entityId: row.id, newValues: { audience: row.audience, destinationType: row.destinationType } } }); return row; }); }
  static async update(id: string, input: MarketingCampaignInput) { const actor = await requireAdminContext("platform:manage_announcements"), data = await validated(input); return prisma.$transaction(async (tx) => { const current = await tx.marketingNotificationCampaign.findUnique({ where: { id } }); if (!current) throw new MarketingNotificationError("Campaign not found.", "NOT_FOUND"); if (!(current.status === AnnouncementStatus.DRAFT || current.status === AnnouncementStatus.SCHEDULED)) throw new MarketingNotificationError("Published or cancelled campaigns cannot be edited.", "CONFLICT"); const status = current.status === AnnouncementStatus.SCHEDULED && !data.scheduledAt ? AnnouncementStatus.DRAFT : current.status; const row = await tx.marketingNotificationCampaign.update({ where: { id }, data: { ...data, status }, select: campaignSelect }); await tx.auditLog.create({ data: { userId: actor.userId, action: "MARKETING_NOTIFICATION_EDITED", entity: "MarketingNotificationCampaign", entityId: id, oldValues: { status: current.status }, newValues: { status, destinationPath: data.destinationPath } } }); return row; }); }
  static async publish(id: string) { const actor = await requireAdminContext("platform:manage_announcements"), now = new Date(); return prisma.$transaction(async (tx) => { const current = await tx.marketingNotificationCampaign.findUnique({ where: { id } }); if (!current) throw new MarketingNotificationError("Campaign not found.", "NOT_FOUND"); if (!(current.status === AnnouncementStatus.DRAFT || current.status === AnnouncementStatus.SCHEDULED)) throw new MarketingNotificationError("Campaign has already been finalized.", "CONFLICT"); const destination = await resolveMarketingDestination(current.destinationType, current.destinationReference); if (current.expiresAt && current.expiresAt <= now) throw new MarketingNotificationError("An expired campaign cannot be published."); const scheduled = !!current.scheduledAt && current.scheduledAt > now, status = scheduled ? AnnouncementStatus.SCHEDULED : AnnouncementStatus.PUBLISHED; const changed = await tx.marketingNotificationCampaign.updateMany({ where: { id, status: { in: [AnnouncementStatus.DRAFT, AnnouncementStatus.SCHEDULED] } }, data: { status, destinationPath: destination.path, publishedAt: scheduled ? null : now, publishedById: actor.userId } }); if (changed.count !== 1) throw new MarketingNotificationError("Campaign was changed by another administrator.", "CONFLICT"); if (!scheduled && current.pushEnabled) await tx.marketingPushDispatch.upsert({ where: { campaignId: id }, update: {}, create: { campaignId: id } }); await tx.auditLog.create({ data: { userId: actor.userId, action: scheduled ? "MARKETING_NOTIFICATION_SCHEDULED" : "MARKETING_NOTIFICATION_PUBLISHED", entity: "MarketingNotificationCampaign", entityId: id, newValues: { status, consentRequired: true, pushEnabled: current.pushEnabled, dailyLimit: MARKETING_DAILY_LIMIT } } }); return tx.marketingNotificationCampaign.findUniqueOrThrow({ where: { id }, select: campaignSelect }); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
  static async cancel(id: string) { const actor = await requireAdminContext("platform:manage_announcements"), now = new Date(); return prisma.$transaction(async (tx) => { const changed = await tx.marketingNotificationCampaign.updateMany({ where: { id, status: { in: [AnnouncementStatus.DRAFT, AnnouncementStatus.SCHEDULED, AnnouncementStatus.PUBLISHED] } }, data: { status: AnnouncementStatus.CANCELLED } }); if (changed.count !== 1) throw new MarketingNotificationError("Only active campaigns can be cancelled.", "CONFLICT"); await tx.marketingPushDispatch.updateMany({ where: { campaignId: id, status: { in: ["PENDING", "PROCESSING"] } }, data: { status: "CANCELLED", cancelledAt: now, lockedAt: null, lockToken: null } }); await tx.pushDeliveryOutbox.updateMany({ where: { marketingCampaignId: id, status: { in: ["PENDING", "RETRYING"] } }, data: { status: "SKIPPED", failureCode: "MARKETING_CAMPAIGN_CANCELLED", lastFailureAt: now } }); await tx.auditLog.create({ data: { userId: actor.userId, action: "MARKETING_NOTIFICATION_CANCELLED", entity: "MarketingNotificationCampaign", entityId: id } }); return tx.marketingNotificationCampaign.findUniqueOrThrow({ where: { id }, select: campaignSelect }); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
  static async advanceLifecycle(now = new Date()) { return prisma.$transaction(async (tx) => { const due = await tx.marketingNotificationCampaign.findMany({ where: { status: AnnouncementStatus.SCHEDULED, scheduledAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, select: { id: true, pushEnabled: true } }); const expiring = await tx.marketingNotificationCampaign.findMany({ where: { status: { in: [AnnouncementStatus.SCHEDULED, AnnouncementStatus.PUBLISHED] }, expiresAt: { lte: now } }, select: { id: true } }); const published = await tx.marketingNotificationCampaign.updateMany({ where: { id: { in: due.map((row) => row.id) }, status: AnnouncementStatus.SCHEDULED }, data: { status: AnnouncementStatus.PUBLISHED, publishedAt: now } }); const expired = await tx.marketingNotificationCampaign.updateMany({ where: { id: { in: expiring.map((row) => row.id) }, status: { in: [AnnouncementStatus.SCHEDULED, AnnouncementStatus.PUBLISHED] } }, data: { status: AnnouncementStatus.EXPIRED } }); const pushCampaigns = due.filter((row) => row.pushEnabled); if (pushCampaigns.length) await tx.marketingPushDispatch.createMany({ data: pushCampaigns.map(({ id }) => ({ campaignId: id })), skipDuplicates: true }); if (expiring.length) { await tx.marketingPushDispatch.updateMany({ where: { campaignId: { in: expiring.map(({ id }) => id) }, status: { in: ["PENDING", "PROCESSING"] } }, data: { status: "EXPIRED", cancelledAt: now, lockedAt: null, lockToken: null } }); await tx.pushDeliveryOutbox.updateMany({ where: { marketingCampaignId: { in: expiring.map(({ id }) => id) }, status: { in: ["PENDING", "RETRYING"] } }, data: { status: "SKIPPED", failureCode: "MARKETING_CAMPAIGN_EXPIRED", lastFailureAt: now } }); } if (published.count) await tx.auditLog.createMany({ data: due.map(({ id }) => ({ action: "MARKETING_NOTIFICATION_PUBLISHED", entity: "MarketingNotificationCampaign", entityId: id, newValues: { scheduler: true } })) }); if (expired.count) await tx.auditLog.createMany({ data: expiring.map(({ id }) => ({ action: "MARKETING_NOTIFICATION_EXPIRED", entity: "MarketingNotificationCampaign", entityId: id })) }); return { published: published.count, expired: expired.count }; }); }

  static async deliverForUser(userId: string) {
    const audiences = await eligibleAudiencesForUser(userId);
    if (!audiences.length) return [];
    const now = new Date(), dayAgo = new Date(now.getTime() - 86_400_000);
    const delivered = await prisma.$transaction(async (tx) => {
      const activeWhere: Prisma.MarketingNotificationCampaignWhereInput = { status: AnnouncementStatus.PUBLISHED, publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], audience: { in: audiences } };
      const deliveredToday = await tx.marketingNotificationUserState.count({ where: { userId, deliveredAt: { gte: dayAgo } } });
      const candidates = await tx.marketingNotificationCampaign.findMany({ where: { ...activeWhere, userStates: { none: { userId } } }, orderBy: { publishedAt: "asc" }, take: Math.max(0, MARKETING_DAILY_LIMIT - deliveredToday) });
      const eligible: typeof candidates = [];
      for (const row of candidates) { try { await resolveMarketingDestination(row.destinationType, row.destinationReference); eligible.push(row); } catch { /* Destination became unavailable; do not deliver it. */ } }
      if (eligible.length) await tx.marketingNotificationUserState.createMany({ data: eligible.map((row) => ({ campaignId: row.id, userId, deliveredAt: now })), skipDuplicates: true });
      return tx.marketingNotificationCampaign.findMany({ where: { ...activeWhere, userStates: { some: { userId, dismissedAt: null } } }, include: { userStates: { where: { userId }, select: { deliveredAt: true, readAt: true, dismissedAt: true } } }, orderBy: { publishedAt: "desc" } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    const valid = [], invalidIds: string[] = [];
    for (const row of delivered) { try { await resolveMarketingDestination(row.destinationType, row.destinationReference); valid.push(row); } catch { invalidIds.push(row.id); } }
    if (invalidIds.length) await prisma.marketingNotificationUserState.updateMany({ where: { userId, campaignId: { in: invalidIds } }, data: { dismissedAt: now } });
    return valid;
  }
  static async listForUser(userId: string, input: { page: number; pageSize: number; read?: "read" | "unread" }) { const audiences = await eligibleAudiencesForUser(userId); if (!audiences.length) return { items: [], total: 0 }; await this.deliverForUser(userId); const now = new Date(); const where: Prisma.MarketingNotificationCampaignWhereInput = { status: AnnouncementStatus.PUBLISHED, audience: { in: audiences }, publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], userStates: input.read === "read" ? { some: { userId, readAt: { not: null }, dismissedAt: null } } : input.read === "unread" ? { some: { userId, readAt: null, dismissedAt: null } } : { some: { userId, dismissedAt: null } } }; const [rows, total] = await Promise.all([prisma.marketingNotificationCampaign.findMany({ where, include: { userStates: { where: { userId }, select: { readAt: true, deliveredAt: true } } }, orderBy: { publishedAt: "desc" }, skip: (input.page - 1) * input.pageSize, take: input.pageSize }), prisma.marketingNotificationCampaign.count({ where })]); return { items: rows.map(({ userStates, ...row }) => ({ ...row, readAt: userStates[0]?.readAt ?? null, deliveredAt: userStates[0]?.deliveredAt ?? row.publishedAt ?? row.createdAt })), total }; }
  static async unreadCount(userId: string) { const audiences = await eligibleAudiencesForUser(userId); if (!audiences.length) return 0; const now = new Date(); return prisma.marketingNotificationCampaign.count({ where: { status: AnnouncementStatus.PUBLISHED, audience: { in: audiences }, publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], userStates: { some: { userId, readAt: null, dismissedAt: null } } } }); }
  static async setRead(userId: string, id: string, read: boolean) { const changed = await prisma.marketingNotificationUserState.updateMany({ where: { campaignId: id, userId, dismissedAt: null }, data: { readAt: read ? new Date() : null } }); if (!changed.count) throw new MarketingNotificationError("Marketing notification not found.", "NOT_FOUND"); }
  static async dismiss(userId: string, id: string) { const changed = await prisma.marketingNotificationUserState.updateMany({ where: { campaignId: id, userId }, data: { dismissedAt: new Date() } }); if (!changed.count) throw new MarketingNotificationError("Marketing notification not found.", "NOT_FOUND"); }
  static async markAllRead(userId: string) { const audiences = await eligibleAudiencesForUser(userId); if (!audiences.length) return 0; const result = await prisma.marketingNotificationUserState.updateMany({ where: { userId, readAt: null, dismissedAt: null, campaign: { status: AnnouncementStatus.PUBLISHED, audience: { in: audiences }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }, data: { readAt: new Date() } }); return result.count; }
}
