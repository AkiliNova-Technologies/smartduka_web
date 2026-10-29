import { createHash, randomUUID } from "node:crypto";
import { AnnouncementAudience, AnnouncementContentClass, AnnouncementPushDispatchStatus, AnnouncementStatus, BrowserPushSubscriptionStatus, PlatformRole, Prisma, PushDeliveryKind, PushDeliveryStatus, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { safeNotificationPath } from "@/services/notifications";

const RECIPIENT_BATCH_SIZE = 100;
const DISPATCH_BATCH_SIZE = 5;
const STALE_LOCK_MS = 10 * 60_000;
const ADMIN_ROLES: PlatformRole[] = [PlatformRole.SUPER_ADMIN, PlatformRole.ADMIN, PlatformRole.SUPPORT, PlatformRole.BILLING];

function audienceWhere(audience: AnnouncementAudience): Prisma.UserWhereInput {
  if (audience === AnnouncementAudience.CUSTOMERS) return { OR: [{ platformRole: null }, { platformRole: PlatformRole.CUSTOMER }] };
  if (audience === AnnouncementAudience.VENDORS) return { OR: [{ platformRole: PlatformRole.VENDOR }, { vendorId: { not: null } }, { ownedVendor: { isNot: null } }] };
  if (audience === AnnouncementAudience.ADMINISTRATORS) return { platformRole: { in: ADMIN_ROLES } };
  return {};
}

export class AnnouncementPushService {
  static async stopDispatches(announcementIds: string[], status: AnnouncementPushDispatchStatus) {
    if (!announcementIds.length) return;
    const now = new Date();
    await prisma.$transaction([
      prisma.announcementPushDispatch.updateMany({ where: { announcementId: { in: announcementIds }, status: { in: [AnnouncementPushDispatchStatus.PENDING, AnnouncementPushDispatchStatus.PROCESSING] } }, data: { status, cancelledAt: now, lockToken: null, lockedAt: null } }),
      prisma.pushDeliveryOutbox.updateMany({ where: { announcementId: { in: announcementIds }, status: { in: [PushDeliveryStatus.PENDING, PushDeliveryStatus.RETRYING] } }, data: { status: PushDeliveryStatus.SKIPPED, failureCode: status === AnnouncementPushDispatchStatus.EXPIRED ? "ANNOUNCEMENT_EXPIRED" : "ANNOUNCEMENT_CANCELLED", lastFailureAt: now } }),
    ]);
  }

  static async runFanout(now = new Date()) {
    const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
    const candidates = await prisma.announcementPushDispatch.findMany({ where: { OR: [{ status: AnnouncementPushDispatchStatus.PENDING }, { status: AnnouncementPushDispatchStatus.PROCESSING, OR: [{ lockedAt: null }, { lockedAt: { lt: staleBefore } }] }] }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: DISPATCH_BATCH_SIZE, select: { id: true } });
    let processed = 0, queued = 0, completed = 0;
    for (const candidate of candidates) {
      const token = randomUUID();
      const claimed = await prisma.announcementPushDispatch.updateMany({ where: { id: candidate.id, OR: [{ status: AnnouncementPushDispatchStatus.PENDING }, { status: AnnouncementPushDispatchStatus.PROCESSING, OR: [{ lockedAt: null }, { lockedAt: { lt: staleBefore } }] }] }, data: { status: AnnouncementPushDispatchStatus.PROCESSING, lockToken: token, lockedAt: now, startedAt: now } });
      if (!claimed.count) continue;
      const result = await this.processBatch(candidate.id, token, now);
      processed += result.processed; queued += result.queued; completed += result.completed ? 1 : 0;
    }
    return { dispatches: candidates.length, processed, queued, completed };
  }

  private static async processBatch(id: string, token: string, now: Date) {
    const dispatch = await prisma.announcementPushDispatch.findFirst({ where: { id, status: AnnouncementPushDispatchStatus.PROCESSING, lockToken: token }, include: { announcement: true } });
    if (!dispatch) return { processed: 0, queued: 0, completed: false };
    const announcement = dispatch.announcement;
    if (!announcement.pushEnabled || announcement.status !== AnnouncementStatus.PUBLISHED) {
      await this.finishInvalid(id, token, AnnouncementPushDispatchStatus.CANCELLED);
      return { processed: 0, queued: 0, completed: true };
    }
    if (announcement.expiresAt && announcement.expiresAt <= now) {
      await this.finishInvalid(id, token, AnnouncementPushDispatchStatus.EXPIRED);
      return { processed: 0, queued: 0, completed: true };
    }
    const users = await prisma.user.findMany({ where: { id: dispatch.cursorUserId ? { gt: dispatch.cursorUserId } : undefined, status: UserStatus.ACTIVE, deletedAt: null, AND: [audienceWhere(announcement.audience), { OR: [{ browserPushSubscriptions: { some: { status: BrowserPushSubscriptionStatus.ACTIVE } } }, { devices: { some: { enabled: true, platform: "ANDROID" } } }] }], ...(announcement.contentClass === AnnouncementContentClass.PROMOTIONAL ? { settings: { promotionalPushNotifications: true } } : {}) }, orderBy: { id: "asc" }, take: RECIPIENT_BATCH_SIZE, select: { id: true } });
    if (!users.length) {
      await prisma.announcementPushDispatch.updateMany({ where: { id, lockToken: token }, data: { status: AnnouncementPushDispatchStatus.COMPLETED, completedAt: now, lockedAt: null, lockToken: null } });
      return { processed: 0, queued: 0, completed: true };
    }
    const path = safeNotificationPath(announcement.destination) ?? "/notifications";
    const rows = users.map((user) => ({ idempotencyKey: `push:announcement:${announcement.id}:${user.id}`, announcementId: announcement.id, userId: user.id, kind: PushDeliveryKind.ANNOUNCEMENT, title: announcement.title, message: announcement.message.slice(0, 1000), actionPath: path }));
    const created = await prisma.$transaction(async (tx) => {
      const result = await tx.pushDeliveryOutbox.createMany({ data: rows, skipDuplicates: true });
      await tx.announcementPushDispatch.updateMany({ where: { id, lockToken: token, status: AnnouncementPushDispatchStatus.PROCESSING }, data: { cursorUserId: users.at(-1)!.id, processedRecipients: { increment: users.length }, queuedRecipients: { increment: result.count }, lockedAt: null, lockToken: null } });
      return result.count;
    });
    return { processed: users.length, queued: created, completed: false };
  }

  private static async finishInvalid(id: string, token: string, status: AnnouncementPushDispatchStatus) {
    await prisma.announcementPushDispatch.updateMany({ where: { id, lockToken: token }, data: { status, cancelledAt: new Date(), lockedAt: null, lockToken: null } });
  }

  static notificationTag(announcementId: string) {
    return `mwezora:announcement:${createHash("sha256").update(announcementId).digest("hex").slice(0, 24)}`;
  }
}
