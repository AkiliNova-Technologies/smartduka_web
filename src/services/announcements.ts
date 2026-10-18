import {
  AnnouncementAudience,
  AnnouncementCategory,
  AnnouncementContentClass,
  AnnouncementPresentation,
  AnnouncementPriority,
  AnnouncementPushDispatchStatus,
  AnnouncementStatus,
  PlatformRole,
  Prisma,
  PushDeliveryStatus,
  UserStatus,
} from "@prisma/client";
import { requireAdminContext } from "@/lib/auth/admin-context";
import { prisma } from "@/lib/prisma/client";
import { safeNotificationPath } from "@/services/notifications";

const ADMIN_ROLES: PlatformRole[] = [PlatformRole.SUPER_ADMIN, PlatformRole.ADMIN, PlatformRole.SUPPORT, PlatformRole.BILLING];

export class AnnouncementError extends Error {
  constructor(message: string, public code = "VALIDATION_ERROR") { super(message); }
}

export interface AnnouncementInput {
  title: string;
  message: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  presentation?: AnnouncementPresentation;
  contentClass?: AnnouncementContentClass;
  pushEnabled?: boolean;
  destination?: string | null;
  scheduledAt?: string | null;
  expiresAt?: string | null;
}

function text(value: unknown, max: number, label: string) {
  const clean = typeof value === "string" ? value.trim().replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ") : "";
  if (!clean) throw new AnnouncementError(`${label} is required.`);
  if (clean.length > max) throw new AnnouncementError(`${label} must be ${max} characters or fewer.`);
  return clean;
}

function date(value: string | null | undefined, label: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new AnnouncementError(`${label} is invalid.`);
  return parsed;
}

function validated(input: AnnouncementInput, now = new Date()) {
  const scheduledAt = date(input.scheduledAt, "Publication time");
  const expiresAt = date(input.expiresAt, "Expiration time");
  if (scheduledAt && expiresAt && expiresAt <= scheduledAt) throw new AnnouncementError("Expiration must be after publication.");
  if (expiresAt && expiresAt <= now) throw new AnnouncementError("Expiration must be in the future.");
  const destination = input.destination?.trim() ? safeNotificationPath(input.destination) : null;
  if (input.destination?.trim() && !destination) throw new AnnouncementError("Destination must be a safe internal Mwezora path.");
  if (!Object.values(AnnouncementCategory).includes(input.category)) throw new AnnouncementError("Choose a valid category.");
  if (!Object.values(AnnouncementPriority).includes(input.priority)) throw new AnnouncementError("Choose a valid priority.");
  if (!Object.values(AnnouncementAudience).includes(input.audience)) throw new AnnouncementError("Choose a valid audience.");
  const presentation = input.presentation ?? AnnouncementPresentation.NOTIFICATION;
  if (!Object.values(AnnouncementPresentation).includes(presentation)) throw new AnnouncementError("Choose a valid presentation.");
  const contentClass = input.contentClass ?? AnnouncementContentClass.ESSENTIAL;
  if (!Object.values(AnnouncementContentClass).includes(contentClass)) throw new AnnouncementError("Choose a valid announcement classification.");
  if (input.category === AnnouncementCategory.PRODUCT && contentClass !== AnnouncementContentClass.PROMOTIONAL) throw new AnnouncementError("Product announcements must be classified as promotional.");
  return { title: text(input.title, 160, "Title"), message: text(input.message, 2000, "Message"), category: input.category, priority: input.priority, audience: input.audience, presentation, contentClass, pushEnabled: input.pushEnabled === true, destination, scheduledAt, expiresAt };
}

function audienceFor(user: { platformRole: PlatformRole | null; vendorId: string | null; ownedVendor: { id: string } | null }) {
  const audiences: AnnouncementAudience[] = [AnnouncementAudience.ALL];
  if (user.vendorId || user.ownedVendor || user.platformRole === PlatformRole.VENDOR) audiences.push(AnnouncementAudience.VENDORS);
  if (user.platformRole && ADMIN_ROLES.includes(user.platformRole)) audiences.push(AnnouncementAudience.ADMINISTRATORS);
  if (!user.platformRole || user.platformRole === PlatformRole.CUSTOMER) audiences.push(AnnouncementAudience.CUSTOMERS);
  return [...new Set(audiences)];
}

async function userAudiences(userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, status: UserStatus.ACTIVE, deletedAt: null }, select: { platformRole: true, vendorId: true, ownedVendor: { select: { id: true } } } });
  if (!user) throw new AnnouncementError("An active account is required.", "FORBIDDEN");
  return audienceFor(user);
}

const adminSelect = {
  id: true, title: true, message: true, category: true, priority: true, audience: true,
  presentation: true, contentClass: true, pushEnabled: true, destination: true, status: true, scheduledAt: true, publishedAt: true,
  expiresAt: true, createdAt: true, updatedAt: true,
  pushDispatch: { select: { status: true, processedRecipients: true, queuedRecipients: true, completedAt: true } },
  createdBy: { select: { id: true, name: true } }, publishedBy: { select: { id: true, name: true } },
} satisfies Prisma.AnnouncementSelect;

export class AnnouncementService {
  static async adminList() {
    await requireAdminContext("platform:manage_announcements");
    await this.advanceLifecycle();
    const announcements = await prisma.announcement.findMany({ select: adminSelect, orderBy: { createdAt: "desc" }, take: 250 });
    const counts = await prisma.pushDeliveryOutbox.groupBy({ by: ["announcementId", "status"], where: { announcementId: { in: announcements.map(({ id }) => id) } }, _count: { _all: true } });
    return announcements.map((announcement) => {
      const count = (status: PushDeliveryStatus) => counts.find((row) => row.announcementId === announcement.id && row.status === status)?._count._all ?? 0;
      return { ...announcement, pushDelivery: { accepted: count(PushDeliveryStatus.DELIVERED), retrying: count(PushDeliveryStatus.RETRYING), failed: count(PushDeliveryStatus.FAILED), skipped: count(PushDeliveryStatus.SKIPPED) } };
    });
  }

  static async create(input: AnnouncementInput) {
    const actor = await requireAdminContext("platform:manage_announcements");
    const data = validated(input);
    return prisma.$transaction(async (tx) => {
      const announcement = await tx.announcement.create({ data: { ...data, createdById: actor.userId }, select: adminSelect });
      await tx.auditLog.create({ data: { userId: actor.userId, action: "ANNOUNCEMENT_CREATED", entity: "Announcement", entityId: announcement.id, newValues: { audience: data.audience, presentation: data.presentation } } });
      return announcement;
    });
  }

  static async update(id: string, input: AnnouncementInput) {
    const actor = await requireAdminContext("platform:manage_announcements");
    const data = validated(input);
    return prisma.$transaction(async (tx) => {
      const current = await tx.announcement.findUnique({ where: { id } });
      if (!current) throw new AnnouncementError("Announcement not found.", "NOT_FOUND");
      if (!(current.status === AnnouncementStatus.DRAFT || current.status === AnnouncementStatus.SCHEDULED)) throw new AnnouncementError("Published or cancelled announcements cannot be edited.", "CONFLICT");
      const status = current.status === AnnouncementStatus.SCHEDULED && !data.scheduledAt ? AnnouncementStatus.DRAFT : current.status;
      const announcement = await tx.announcement.update({ where: { id }, data: { ...data, status }, select: adminSelect });
      await tx.auditLog.create({ data: { userId: actor.userId, action: "ANNOUNCEMENT_EDITED", entity: "Announcement", entityId: id, oldValues: { status: current.status }, newValues: { status, scheduledAt: data.scheduledAt, expiresAt: data.expiresAt } } });
      return announcement;
    });
  }

  static async publish(id: string) {
    const actor = await requireAdminContext("platform:manage_announcements");
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const current = await tx.announcement.findUnique({ where: { id } });
      if (!current) throw new AnnouncementError("Announcement not found.", "NOT_FOUND");
      if (!(current.status === AnnouncementStatus.DRAFT || current.status === AnnouncementStatus.SCHEDULED)) throw new AnnouncementError("Announcement has already been finalized.", "CONFLICT");
      if (current.expiresAt && current.expiresAt <= now) throw new AnnouncementError("An expired announcement cannot be published.");
      const scheduled = !!current.scheduledAt && current.scheduledAt > now;
      const status = scheduled ? AnnouncementStatus.SCHEDULED : AnnouncementStatus.PUBLISHED;
      const changed = await tx.announcement.updateMany({ where: { id, status: { in: [AnnouncementStatus.DRAFT, AnnouncementStatus.SCHEDULED] } }, data: { status, publishedAt: scheduled ? null : now, publishedById: actor.userId } });
      if (changed.count !== 1) throw new AnnouncementError("Announcement was changed by another administrator.", "CONFLICT");
      if (!scheduled && current.pushEnabled) await tx.announcementPushDispatch.upsert({ where: { announcementId: id }, update: {}, create: { announcementId: id } });
      await tx.auditLog.create({ data: { userId: actor.userId, action: scheduled ? "ANNOUNCEMENT_SCHEDULED" : "ANNOUNCEMENT_PUBLISHED", entity: "Announcement", entityId: id, newValues: { status, scheduledAt: current.scheduledAt } } });
      return tx.announcement.findUniqueOrThrow({ where: { id }, select: adminSelect });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  static async cancel(id: string) {
    const actor = await requireAdminContext("platform:manage_announcements");
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const changed = await tx.announcement.updateMany({ where: { id, status: { in: [AnnouncementStatus.DRAFT, AnnouncementStatus.SCHEDULED, AnnouncementStatus.PUBLISHED] } }, data: { status: AnnouncementStatus.CANCELLED } });
      if (changed.count !== 1) throw new AnnouncementError("Only active announcements can be cancelled.", "CONFLICT");
      await tx.announcementPushDispatch.updateMany({ where: { announcementId: id, status: { in: [AnnouncementPushDispatchStatus.PENDING, AnnouncementPushDispatchStatus.PROCESSING] } }, data: { status: AnnouncementPushDispatchStatus.CANCELLED, cancelledAt: now, lockedAt: null, lockToken: null } });
      await tx.pushDeliveryOutbox.updateMany({ where: { announcementId: id, status: { in: [PushDeliveryStatus.PENDING, PushDeliveryStatus.RETRYING, PushDeliveryStatus.PROCESSING] } }, data: { status: PushDeliveryStatus.SKIPPED, failureCode: "ANNOUNCEMENT_CANCELLED", lastFailureAt: now, lockedAt: null, lockToken: null } });
      await tx.auditLog.create({ data: { userId: actor.userId, action: "ANNOUNCEMENT_CANCELLED", entity: "Announcement", entityId: id } });
      return tx.announcement.findUniqueOrThrow({ where: { id }, select: adminSelect });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  static async advanceLifecycle(now = new Date()) {
    return prisma.$transaction(async (tx) => {
      const due = await tx.announcement.findMany({ where: { status: AnnouncementStatus.SCHEDULED, scheduledAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, select: { id: true, pushEnabled: true } });
      const expiring = await tx.announcement.findMany({ where: { status: { in: [AnnouncementStatus.SCHEDULED, AnnouncementStatus.PUBLISHED] }, expiresAt: { lte: now } }, select: { id: true } });
      const published = await tx.announcement.updateMany({ where: { status: AnnouncementStatus.SCHEDULED, scheduledAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, data: { status: AnnouncementStatus.PUBLISHED, publishedAt: now } });
      const expired = await tx.announcement.updateMany({ where: { status: { in: [AnnouncementStatus.SCHEDULED, AnnouncementStatus.PUBLISHED] }, expiresAt: { lte: now } }, data: { status: AnnouncementStatus.EXPIRED } });
      const pushDue = due.filter((item) => item.pushEnabled);
      if (pushDue.length) await tx.announcementPushDispatch.createMany({ data: pushDue.map(({ id }) => ({ announcementId: id })), skipDuplicates: true });
      if (expiring.length) {
        await tx.announcementPushDispatch.updateMany({ where: { announcementId: { in: expiring.map(({ id }) => id) }, status: { in: [AnnouncementPushDispatchStatus.PENDING, AnnouncementPushDispatchStatus.PROCESSING] } }, data: { status: AnnouncementPushDispatchStatus.EXPIRED, cancelledAt: now, lockedAt: null, lockToken: null } });
        await tx.pushDeliveryOutbox.updateMany({ where: { announcementId: { in: expiring.map(({ id }) => id) }, status: { in: [PushDeliveryStatus.PENDING, PushDeliveryStatus.RETRYING, PushDeliveryStatus.PROCESSING] } }, data: { status: PushDeliveryStatus.SKIPPED, failureCode: "ANNOUNCEMENT_EXPIRED", lastFailureAt: now, lockedAt: null, lockToken: null } });
      }
      if (published.count) await tx.auditLog.createMany({ data: due.map(({ id }) => ({ action: "ANNOUNCEMENT_PUBLISHED", entity: "Announcement", entityId: id, newValues: { status: AnnouncementStatus.PUBLISHED, scheduler: true } })) });
      if (expired.count) await tx.auditLog.createMany({ data: expiring.map(({ id }) => ({ action: "ANNOUNCEMENT_EXPIRED", entity: "Announcement", entityId: id, newValues: { status: AnnouncementStatus.EXPIRED } })) });
      return { published: published.count, expired: expired.count };
    });
  }

  static async listForUser(userId: string, input: { page: number; pageSize: number; read?: "read" | "unread"; category?: AnnouncementCategory }) {
    const audiences = await userAudiences(userId);
    const now = new Date();
    const stateFilter = input.read === "read" ? { some: { userId, readAt: { not: null } } } : input.read === "unread" ? { none: { userId, readAt: { not: null } } } : undefined;
    const where: Prisma.AnnouncementWhereInput = { status: AnnouncementStatus.PUBLISHED, publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], audience: { in: audiences }, ...(input.category ? { category: input.category } : {}), ...(stateFilter ? { userStates: stateFilter } : {}), userStates: { ...(stateFilter ?? {}), none: { userId, dismissedAt: { not: null } } } };
    // Rebuild relation filters because Prisma cannot accept `some` and `none` through object spread reliably.
    if (input.read === "read") where.userStates = { some: { userId, readAt: { not: null }, dismissedAt: null } };
    else if (input.read === "unread") where.userStates = { none: { userId, OR: [{ readAt: { not: null } }, { dismissedAt: { not: null } }] } };
    else where.userStates = { none: { userId, dismissedAt: { not: null } } };
    const [items, total] = await Promise.all([
      prisma.announcement.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (input.page - 1) * input.pageSize, take: input.pageSize, include: { userStates: { where: { userId }, select: { readAt: true, dismissedAt: true } } } }),
      prisma.announcement.count({ where }),
    ]);
    return { items: items.map(({ userStates, ...item }) => ({ ...item, readAt: userStates[0]?.readAt ?? null })), total };
  }

  static async unreadCount(userId: string) {
    const audiences = await userAudiences(userId); const now = new Date();
    return prisma.announcement.count({ where: { status: AnnouncementStatus.PUBLISHED, publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], audience: { in: audiences }, userStates: { none: { userId, OR: [{ readAt: { not: null } }, { dismissedAt: { not: null } }] } } } });
  }

  static async setRead(userId: string, id: string, read: boolean) {
    await this.assertEligible(userId, id);
    return prisma.announcementUserState.upsert({ where: { announcementId_userId: { announcementId: id, userId } }, create: { announcementId: id, userId, readAt: read ? new Date() : null }, update: { readAt: read ? new Date() : null, dismissedAt: null } });
  }

  static async dismiss(userId: string, id: string) {
    await this.assertEligible(userId, id);
    return prisma.announcementUserState.upsert({ where: { announcementId_userId: { announcementId: id, userId } }, create: { announcementId: id, userId, dismissedAt: new Date() }, update: { dismissedAt: new Date() } });
  }

  static async markAllRead(userId: string) {
    let updated = 0;
    while (true) {
      const { items } = await this.listForUser(userId, { page: 1, pageSize: 200, read: "unread" });
      if (!items.length) return updated;
      const now = new Date();
      await prisma.$transaction(items.map((item) => prisma.announcementUserState.upsert({ where: { announcementId_userId: { announcementId: item.id, userId } }, create: { announcementId: item.id, userId, readAt: now }, update: { readAt: now } })));
      updated += items.length;
    }
  }

  static async activeBanners(userId: string) {
    const { items } = await this.listForUser(userId, { page: 1, pageSize: 5 });
    return items.filter((item) => item.presentation === AnnouncementPresentation.BANNER).slice(0, 1);
  }

  private static async assertEligible(userId: string, id: string) {
    const audiences = await userAudiences(userId); const now = new Date();
    const row = await prisma.announcement.findFirst({ where: { id, status: AnnouncementStatus.PUBLISHED, publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], audience: { in: audiences } }, select: { id: true } });
    if (!row) throw new AnnouncementError("Announcement not found.", "NOT_FOUND");
  }
}
