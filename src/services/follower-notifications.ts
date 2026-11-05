import { randomUUID } from "node:crypto";
import { NotificationType, Prisma, PushDeliveryKind, PushDeliveryStatus, StorePublicationKind, StorePublicationStatus, StorePublicationTopic, UserStatus, VendorStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { VendorEntitlementService } from "@/services/vendor-entitlement";

const integerConfig = (name: string, fallback: number, min: number, max: number) => { const parsed = Number(process.env[name] ?? fallback); return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback; };
const BATCH_SIZE = () => integerConfig("FOLLOWER_NOTIFICATION_BATCH_SIZE", 100, 1, 500);
const WORKER_CONCURRENCY = () => integerConfig("FOLLOWER_NOTIFICATION_WORKER_CONCURRENCY", 2, 1, 10);
const MAX_ATTEMPTS = () => integerConfig("FOLLOWER_NOTIFICATION_MAX_ATTEMPTS", 5, 1, 10);
const DAILY_LIMIT = () => integerConfig("FOLLOWER_NOTIFICATION_DAILY_LIMIT", 3, 1, 20);
const STALE_LOCK_MS = 10 * 60_000;
const INTERNAL_PATH = /^\/(?!\/)[A-Za-z0-9/_?=&.%-]*$/;
const safeNotificationPath = (value: string) => value.length <= 500 && INTERNAL_PATH.test(value) ? value : null;

export const followerNotificationProcessingEnabled = () => process.env.FOLLOWER_NOTIFICATIONS_ENABLED === "true";
export const followerPushEnabled = () => process.env.FOLLOWER_PUSH_ENABLED === "true";

const preferenceField = (topic: StorePublicationTopic) => topic === StorePublicationTopic.ANNOUNCEMENT ? "followedStoreAnnouncements" as const : topic === StorePublicationTopic.NEW_ARRIVALS ? "followedStoreNewArrivals" as const : "followedStoreCampaigns" as const;
const eventType = (topic: StorePublicationTopic) => topic === StorePublicationTopic.ANNOUNCEMENT ? "FOLLOWED_STORE_ANNOUNCEMENT" : topic === StorePublicationTopic.NEW_ARRIVALS ? "FOLLOWED_STORE_NEW_ARRIVAL" : "FOLLOWED_STORE_CAMPAIGN";
const retryAt = (attempt: number, now: Date) => new Date(now.getTime() + Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, attempt - 1)));

export class FollowerNotificationService {
  static rollout() { return { processingEnabled: followerNotificationProcessingEnabled(), pushEnabled: followerPushEnabled(), batchSize: BATCH_SIZE(), workerConcurrency: WORKER_CONCURRENCY(), maxAttempts: MAX_ATTEMPTS(), dailyLimit: DAILY_LIMIT() }; }

  static async run(now = new Date()) {
    if (!followerNotificationProcessingEnabled()) return { disabled: true, scheduled: 0, claimed: 0, completed: 0, retried: 0, failed: 0 };
    const scheduled = await this.schedule(now);
    await prisma.storePublicationDispatch.updateMany({ where: { status: PushDeliveryStatus.PROCESSING, lockedAt: { lt: new Date(now.getTime() - STALE_LOCK_MS) } }, data: { status: PushDeliveryStatus.RETRYING, lockedAt: null, lockToken: null, nextAttemptAt: now, failureCode: "WORKER_LOCK_EXPIRED", lastFailureAt: now } });
    const candidates = await prisma.storePublicationDispatch.findMany({ where: { status: { in: [PushDeliveryStatus.PENDING, PushDeliveryStatus.RETRYING] }, nextAttemptAt: { lte: now } }, select: { id: true }, orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }], take: WORKER_CONCURRENCY() });
    const results = { disabled: false, scheduled, claimed: 0, completed: 0, retried: 0, failed: 0 };
    await Promise.all(candidates.map(async candidate => { const token = randomUUID(); const claim = await prisma.storePublicationDispatch.updateMany({ where: { id: candidate.id, status: { in: [PushDeliveryStatus.PENDING, PushDeliveryStatus.RETRYING] }, nextAttemptAt: { lte: now } }, data: { status: PushDeliveryStatus.PROCESSING, lockedAt: now, lockToken: token, attempts: { increment: 1 } } }); if (!claim.count) return; results.claimed++; const outcome = await this.processClaim(candidate.id, token, now); results[outcome]++; }));
    return results;
  }

  static async schedule(now = new Date()) {
    const events = await prisma.storePublicationEvent.findMany({ where: { notificationEligible: true, dispatch: null }, select: { id: true }, take: WORKER_CONCURRENCY() * 5, orderBy: [{ publishedAt: "asc" }, { id: "asc" }] });
    if (!events.length) return 0;
    const result = await prisma.storePublicationDispatch.createMany({ data: events.map(event => ({ publicationEventId: event.id, nextAttemptAt: now })), skipDuplicates: true });
    return result.count;
  }

  private static async loadEvent(dispatchId: string, token: string) {
    return prisma.storePublicationDispatch.findFirst({ where: { id: dispatchId, status: PushDeliveryStatus.PROCESSING, lockToken: token }, include: { publicationEvent: { include: { publication: { include: { vendor: { select: { id: true, status: true, storeName: true, slug: true, logoUrl: true } }, destinationProduct: { select: { slug: true } } } } } } } });
  }

  private static async processClaim(dispatchId: string, token: string, now: Date): Promise<"completed" | "retried" | "failed"> {
    try {
      const dispatch = await this.loadEvent(dispatchId, token);
      if (!dispatch) return "completed";
      const event = dispatch.publicationEvent, publication = event.publication;
      const active = event.notificationEligible && publication.status === StorePublicationStatus.PUBLISHED && !!publication.publishedAt && publication.publishedAt <= now && (!publication.expiresAt || publication.expiresAt > now) && publication.vendor.status === VendorStatus.ACTIVE;
      if (!active) { await this.complete(dispatchId, token, now, "PUBLICATION_INELIGIBLE"); return "completed"; }
      if (publication.kind === StorePublicationKind.FOLLOWER_CAMPAIGN) { const entitlement = await VendorEntitlementService.getForShop(publication.vendorId, now); if (!entitlement.capabilities.ADVERTISING_ACCESS) { await this.complete(dispatchId, token, now, "VENDOR_ENTITLEMENT_INELIGIBLE"); return "completed"; } }
      const preference = preferenceField(publication.notificationTopic);
      const followers = await prisma.storeFollow.findMany({ where: { vendorId: publication.vendorId, ...(dispatch.cursorFollowId ? { id: { gt: dispatch.cursorFollowId } } : {}), customer: { status: UserStatus.ACTIVE, deletedAt: null, settings: { promotionalInAppNotifications: true, [preference]: true } } }, select: { id: true, customerId: true, customer: { select: { settings: { select: { promotionalPushNotifications: true, [preference]: true } } } } }, orderBy: { id: "asc" }, take: BATCH_SIZE() });
      let created = 0, push = 0;
      const destinationPath = publication.destination === "PRODUCT" && publication.destinationProduct ? `/products/${publication.destinationProduct.slug}` : `/shops/${publication.vendor.slug}`;
      for (const follow of followers) {
        const frequency = await prisma.notification.count({ where: { userId: follow.customerId, eventType: { startsWith: "FOLLOWED_STORE_" }, createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60_000) }, deletedAt: null } });
        if (frequency >= DAILY_LIMIT()) continue;
        const notification = await prisma.notification.upsert({ where: { idempotencyKey: `${event.eventKey}:${follow.customerId}` }, update: {}, create: { idempotencyKey: `${event.eventKey}:${follow.customerId}`, userId: follow.customerId, vendorId: publication.vendorId, storePublicationEventId: event.id, type: NotificationType.INFO, eventType: eventType(publication.notificationTopic), title: publication.title, message: publication.body.slice(0, 1000), imageUrl: publication.imageUrl, actionPath: safeNotificationPath(destinationPath) }, select: { id: true } });
        created++;
        if (followerPushEnabled() && follow.customer.settings?.promotionalPushNotifications === true && follow.customer.settings[preference] === true) { await prisma.pushDeliveryOutbox.upsert({ where: { storePublicationEventId_userId: { storePublicationEventId: event.id, userId: follow.customerId } }, update: {}, create: { idempotencyKey: `push:${event.eventKey}:${follow.customerId}`, userId: follow.customerId, notificationId: notification.id, storePublicationEventId: event.id, kind: PushDeliveryKind.MARKETING, title: publication.title, message: publication.body.slice(0, 1000), actionPath: safeNotificationPath(destinationPath) } }); push++; }
      }
      const last = followers.at(-1)?.id ?? dispatch.cursorFollowId;
      if (followers.length < BATCH_SIZE()) { await prisma.storePublicationDispatch.updateMany({ where: { id: dispatchId, status: PushDeliveryStatus.PROCESSING, lockToken: token }, data: { status: PushDeliveryStatus.DELIVERED, cursorFollowId: last, processedRecipients: { increment: followers.length }, createdNotifications: { increment: created }, queuedPushJobs: { increment: push }, completedAt: now, lockedAt: null, lockToken: null, failureCode: null } }); return "completed"; }
      await prisma.storePublicationDispatch.updateMany({ where: { id: dispatchId, status: PushDeliveryStatus.PROCESSING, lockToken: token }, data: { status: PushDeliveryStatus.RETRYING, cursorFollowId: last, processedRecipients: { increment: followers.length }, createdNotifications: { increment: created }, queuedPushJobs: { increment: push }, nextAttemptAt: now, lockedAt: null, lockToken: null, failureCode: null } });
      return "retried";
    } catch (error) {
      const current = await prisma.storePublicationDispatch.findFirst({ where: { id: dispatchId, lockToken: token }, select: { attempts: true } });
      const failed = (current?.attempts ?? MAX_ATTEMPTS()) >= MAX_ATTEMPTS(), status = failed ? PushDeliveryStatus.FAILED : PushDeliveryStatus.RETRYING;
      await prisma.storePublicationDispatch.updateMany({ where: { id: dispatchId, status: PushDeliveryStatus.PROCESSING, lockToken: token }, data: { status, nextAttemptAt: failed ? now : retryAt(current?.attempts ?? 1, now), lockedAt: null, lockToken: null, lastFailureAt: now, failureCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code.slice(0, 80) : "FOLLOWER_FANOUT_FAILED" } });
      console.warn("[follower-notifications] batch failed", { dispatchId, category: error instanceof Prisma.PrismaClientKnownRequestError ? "database" : "unexpected", exceptionType: error instanceof Error ? error.name : "Unknown" });
      return failed ? "failed" : "retried";
    }
  }

  private static async complete(id: string, token: string, now: Date, reason: string) { await prisma.storePublicationDispatch.updateMany({ where: { id, status: PushDeliveryStatus.PROCESSING, lockToken: token }, data: { status: PushDeliveryStatus.SKIPPED, completedAt: now, lockedAt: null, lockToken: null, failureCode: reason } }); }
}
