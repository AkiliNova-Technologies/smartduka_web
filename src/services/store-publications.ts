import { Prisma, ProductStatus, StorePublicationDestination, StorePublicationKind, StorePublicationStatus, StorePublicationTopic, VendorUserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { VendorEntitlementService } from "@/services/vendor-entitlement";

export class StorePublicationError extends Error {
  constructor(message: string, readonly code = "VALIDATION_ERROR") { super(message); }
}

export type StorePublicationInput = {
  kind: StorePublicationKind;
  notificationTopic?: StorePublicationTopic;
  title: string;
  body: string;
  imageUrl?: string | null;
  destination?: StorePublicationDestination;
  destinationProductId?: string | null;
  productIds?: string[];
  scheduledAt?: string | null;
  expiresAt?: string | null;
};

const publicationSelect = {
  id: true, vendorId: true, kind: true, notificationTopic: true, status: true, title: true, body: true, imageUrl: true,
  destination: true, destinationProductId: true, scheduledAt: true, publishedAt: true, expiresAt: true,
  reviewedAt: true, createdAt: true, updatedAt: true,
  products: { orderBy: { sortOrder: "asc" as const }, select: { product: { select: { id: true, name: true, slug: true, status: true, images: { orderBy: [{ isFeatured: "desc" as const }, { sortOrder: "asc" as const }], take: 1, select: { url: true } } } } } },
  publicationEvent: { select: { id: true, eventKey: true, audienceType: true, notificationEligible: true, eligibilityMetadata: true, publishedAt: true } },
} satisfies Prisma.StorePublicationSelect;

const clean = (value: unknown, max: number, label: string) => {
  const result = typeof value === "string" ? value.trim().replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ") : "";
  if (!result) throw new StorePublicationError(`${label} is required.`);
  if (result.length > max) throw new StorePublicationError(`${label} must be ${max} characters or fewer.`);
  return result;
};
const optionalUrl = (value: string | null | undefined) => {
  if (!value?.trim()) return null;
  try { const url = new URL(value); if (!['https:', 'http:'].includes(url.protocol)) throw new Error(); return url.toString(); }
  catch { throw new StorePublicationError("Image must be a valid HTTP or HTTPS URL."); }
};
const optionalDate = (value: string | null | undefined, label: string) => {
  if (!value) return null; const result = new Date(value);
  if (Number.isNaN(result.valueOf())) throw new StorePublicationError(`${label} is invalid.`);
  return result;
};

async function validate(vendorId: string, input: StorePublicationInput, now = new Date()) {
  if (!Object.values(StorePublicationKind).includes(input.kind)) throw new StorePublicationError("Choose a valid publication type.");
  const destination = input.destination ?? StorePublicationDestination.STOREFRONT;
  if (!Object.values(StorePublicationDestination).includes(destination)) throw new StorePublicationError("Choose a valid destination.");
  const scheduledAt = optionalDate(input.scheduledAt, "Publication time"), expiresAt = optionalDate(input.expiresAt, "Expiration time");
  if (expiresAt && expiresAt <= now) throw new StorePublicationError("Expiration must be in the future.");
  if (scheduledAt && expiresAt && expiresAt <= scheduledAt) throw new StorePublicationError("Expiration must be after publication.");
  const productIds = [...new Set((input.productIds ?? []).filter(Boolean))];
  if (productIds.length > 20) throw new StorePublicationError("Choose no more than 20 products.");
  const requested = [...new Set([...productIds, ...(input.destinationProductId ? [input.destinationProductId] : [])])];
  if (destination === StorePublicationDestination.PRODUCT && !input.destinationProductId) throw new StorePublicationError("Choose a destination product.");
  if (input.kind === StorePublicationKind.ANNOUNCEMENT && productIds.length) throw new StorePublicationError("Product selections are only available for follower campaigns.");
  if (requested.length) {
    const count = await prisma.product.count({ where: { id: { in: requested }, vendorId, deletedAt: null, status: { in: [ProductStatus.ACTIVE, ProductStatus.PUBLISHED] } } });
    if (count !== requested.length) throw new StorePublicationError("Choose only active products owned by this shop.", "FORBIDDEN");
  }
  const notificationTopic = input.notificationTopic ?? (input.kind === StorePublicationKind.ANNOUNCEMENT ? StorePublicationTopic.ANNOUNCEMENT : StorePublicationTopic.CAMPAIGN);
  if (!Object.values(StorePublicationTopic).includes(notificationTopic)) throw new StorePublicationError("Choose a valid notification topic.");
  if (input.kind === StorePublicationKind.ANNOUNCEMENT && notificationTopic !== StorePublicationTopic.ANNOUNCEMENT) throw new StorePublicationError("Announcements must use the announcement topic.");
  if (notificationTopic === StorePublicationTopic.NEW_ARRIVALS && !productIds.length) throw new StorePublicationError("Choose at least one product for a new-arrivals notification.");
  return { kind: input.kind, notificationTopic, title: clean(input.title, 160, "Title"), body: clean(input.body, 2000, "Description"), imageUrl: optionalUrl(input.imageUrl), destination, destinationProductId: destination === StorePublicationDestination.PRODUCT ? input.destinationProductId : null, scheduledAt, expiresAt, productIds };
}

async function requireCampaignEntitlement(vendorId: string, kind: StorePublicationKind) {
  if (kind !== StorePublicationKind.FOLLOWER_CAMPAIGN) return;
  const entitlement = await VendorEntitlementService.getForShop(vendorId);
  if (!entitlement.capabilities.ADVERTISING_ACCESS) throw new StorePublicationError("Your current subscription does not include follower campaigns.", "FORBIDDEN");
}

export class StorePublicationService {
  static async metrics() {
    const context = await requireVendorContext("vendor:manage_audience");
    await this.advanceLifecycle();
    const now = new Date(), day = 86_400_000, since30 = new Date(now.getTime() - 30 * day), since7 = new Date(now.getTime() - 7 * day);
    const [totalFollowers, new7, new30, publishedAnnouncements, activeCampaigns, growthRows] = await Promise.all([
      prisma.storeFollow.count({ where: { vendorId: context.vendorId } }),
      prisma.storeFollow.count({ where: { vendorId: context.vendorId, createdAt: { gte: since7 } } }),
      prisma.storeFollow.count({ where: { vendorId: context.vendorId, createdAt: { gte: since30 } } }),
      prisma.storePublication.count({ where: { vendorId: context.vendorId, kind: StorePublicationKind.ANNOUNCEMENT, status: StorePublicationStatus.PUBLISHED } }),
      prisma.storePublication.count({ where: { vendorId: context.vendorId, kind: StorePublicationKind.FOLLOWER_CAMPAIGN, status: { in: [StorePublicationStatus.PUBLISHED, StorePublicationStatus.SCHEDULED] }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
      prisma.storeFollow.findMany({ where: { vendorId: context.vendorId, createdAt: { gte: since30 } }, select: { createdAt: true }, orderBy: { createdAt: "asc" } }),
    ]);
    const additions = new Map<string, number>();
    for (const row of growthRows) { const key = row.createdAt.toISOString().slice(0, 10); additions.set(key, (additions.get(key) ?? 0) + 1); }
    let running = totalFollowers - growthRows.length;
    const growth = Array.from({ length: 30 }, (_, index) => { const date = new Date(since30.getTime() + (index + 1) * day).toISOString().slice(0, 10); running += additions.get(date) ?? 0; return { date, followers: running, added: additions.get(date) ?? 0 }; });
    return { totalFollowers, newFollowers7Days: new7, newFollowers30Days: new30, publishedAnnouncements, activeCampaigns, growth, engagement: null, notifications: (await import("@/services/follower-notifications")).FollowerNotificationService.rollout() };
  }

  static async list(input: { page: number; pageSize: number; kind?: StorePublicationKind; status?: StorePublicationStatus }) {
    const context = await requireVendorContext("vendor:manage_audience"); await this.advanceLifecycle();
    const where = { vendorId: context.vendorId, ...(input.kind ? { kind: input.kind } : {}), ...(input.status ? { status: input.status } : {}) };
    const [items, total] = await Promise.all([prisma.storePublication.findMany({ where, select: publicationSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize }), prisma.storePublication.count({ where })]);
    return { items, total };
  }

  static async create(input: StorePublicationInput) {
    const context = await requireVendorContext("vendor:manage_audience"), data = await validate(context.vendorId, input);
    await requireCampaignEntitlement(context.vendorId, data.kind);
    return prisma.$transaction(async tx => {
      const { productIds, ...publication } = data;
      const row = await tx.storePublication.create({ data: { ...publication, vendorId: context.vendorId, createdById: context.user.id, products: { create: productIds.map((productId, sortOrder) => ({ productId, sortOrder })) } }, select: publicationSelect });
      await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "STORE_PUBLICATION_CREATED", entity: "StorePublication", entityId: row.id, newValues: { kind: row.kind, status: row.status } } });
      return row;
    });
  }

  static async update(id: string, input: StorePublicationInput) {
    const context = await requireVendorContext("vendor:manage_audience"), data = await validate(context.vendorId, input);
    await requireCampaignEntitlement(context.vendorId, data.kind);
    return prisma.$transaction(async tx => {
      const current = await tx.storePublication.findFirst({ where: { id, vendorId: context.vendorId } });
      if (!current) throw new StorePublicationError("Publication not found.", "NOT_FOUND");
      if (current.status !== StorePublicationStatus.DRAFT) throw new StorePublicationError("Only drafts can be edited.", "CONFLICT");
      await tx.storePublicationProduct.deleteMany({ where: { publicationId: id } });
      const { productIds, ...publication } = data;
      const row = await tx.storePublication.update({ where: { id }, data: { ...publication, products: { create: productIds.map((productId, sortOrder) => ({ productId, sortOrder })) } }, select: publicationSelect });
      await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "STORE_PUBLICATION_EDITED", entity: "StorePublication", entityId: id, oldValues: { kind: current.kind }, newValues: { kind: row.kind } } }); return row;
    });
  }

  static async submit(id: string) {
    const context = await requireVendorContext("vendor:manage_audience");
    const changed = await prisma.$transaction(async tx => { const result = await tx.storePublication.updateMany({ where: { id, vendorId: context.vendorId, status: StorePublicationStatus.DRAFT }, data: { status: StorePublicationStatus.IN_REVIEW } }); if (result.count !== 1) throw new StorePublicationError("Only a draft can be submitted for review.", "CONFLICT"); await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "STORE_PUBLICATION_SUBMITTED", entity: "StorePublication", entityId: id } }); return tx.storePublication.findUniqueOrThrow({ where: { id }, select: publicationSelect }); });
    return changed;
  }

  static async publish(id: string, now = new Date()) {
    const context = await requireVendorContext("vendor:manage_audience");
    if (context.vendorRole !== VendorUserRole.OWNER && context.vendorRole !== VendorUserRole.ADMIN) throw new StorePublicationError("Owner or administrator approval is required to publish.", "FORBIDDEN");
    return prisma.$transaction(async tx => {
      const current = await tx.storePublication.findFirst({ where: { id, vendorId: context.vendorId }, include: { products: true } });
      if (!current) throw new StorePublicationError("Publication not found.", "NOT_FOUND");
      if (current.status !== StorePublicationStatus.IN_REVIEW) throw new StorePublicationError("Submit this publication for review before publishing.", "CONFLICT");
      await requireCampaignEntitlement(context.vendorId, current.kind);
      if (current.expiresAt && current.expiresAt <= now) throw new StorePublicationError("An expired publication cannot be published.");
      const scheduled = Boolean(current.scheduledAt && current.scheduledAt > now), status = scheduled ? StorePublicationStatus.SCHEDULED : StorePublicationStatus.PUBLISHED;
      await tx.storePublication.update({ where: { id }, data: { status, reviewedById: context.user.id, reviewedAt: now, publishedById: context.user.id, publishedAt: scheduled ? null : now } });
      if (!scheduled) await tx.storePublicationEvent.upsert(this.eventArgs({ id, vendorId: context.vendorId, publishedAt: now }));
      await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: scheduled ? "STORE_PUBLICATION_SCHEDULED" : "STORE_PUBLICATION_PUBLISHED", entity: "StorePublication", entityId: id, newValues: { status, notificationFanOut: false } } });
      return tx.storePublication.findUniqueOrThrow({ where: { id }, select: publicationSelect });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  static async archive(id: string) {
    const context = await requireVendorContext("vendor:manage_audience");
    return prisma.$transaction(async tx => { const result = await tx.storePublication.updateMany({ where: { id, vendorId: context.vendorId, status: { in: [StorePublicationStatus.IN_REVIEW, StorePublicationStatus.SCHEDULED, StorePublicationStatus.PUBLISHED] } }, data: { status: StorePublicationStatus.ARCHIVED } }); if (result.count !== 1) throw new StorePublicationError("This publication cannot be archived.", "CONFLICT"); await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "STORE_PUBLICATION_ARCHIVED", entity: "StorePublication", entityId: id } }); return tx.storePublication.findUniqueOrThrow({ where: { id }, select: publicationSelect }); });
  }

  static async advanceLifecycle(now = new Date()) {
    return prisma.$transaction(async tx => {
      const due = await tx.storePublication.findMany({ where: { status: StorePublicationStatus.SCHEDULED, scheduledAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, select: { id: true, vendorId: true } });
      for (const row of due) { const updated = await tx.storePublication.updateMany({ where: { id: row.id, status: StorePublicationStatus.SCHEDULED }, data: { status: StorePublicationStatus.PUBLISHED, publishedAt: now } }); if (updated.count) { await tx.storePublicationEvent.upsert(this.eventArgs({ ...row, publishedAt: now })); await tx.auditLog.create({ data: { vendorId: row.vendorId, action: "STORE_PUBLICATION_PUBLISHED", entity: "StorePublication", entityId: row.id, newValues: { scheduler: true, notificationFanOut: false } } }); } }
      const expiredRows = await tx.storePublication.findMany({ where: { status: { in: [StorePublicationStatus.SCHEDULED, StorePublicationStatus.PUBLISHED] }, expiresAt: { lte: now } }, select: { id: true, vendorId: true } });
      if (expiredRows.length) { await tx.storePublication.updateMany({ where: { id: { in: expiredRows.map(row => row.id) } }, data: { status: StorePublicationStatus.EXPIRED } }); await tx.auditLog.createMany({ data: expiredRows.map(row => ({ vendorId: row.vendorId, action: "STORE_PUBLICATION_EXPIRED", entity: "StorePublication", entityId: row.id })) }); }
      return { published: due.length, expired: expiredRows.length };
    });
  }

  private static eventArgs(row: { id: string; vendorId: string; publishedAt: Date }): Prisma.StorePublicationEventUpsertArgs {
    return { where: { publicationId: row.id }, update: {}, create: { publicationId: row.id, vendorId: row.vendorId, eventKey: `store-publication:${row.id}:published`, audienceType: "STORE_FOLLOWERS", notificationEligible: true, eligibilityMetadata: { deliveryEnabled: false, requiresMarketingConsent: true, followingAloneIsInsufficient: true }, publishedAt: row.publishedAt } };
  }
}
