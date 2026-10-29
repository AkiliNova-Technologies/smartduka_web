import { createHash, randomUUID } from "node:crypto";
import webpush from "web-push";
import { AnnouncementContentClass, AnnouncementStatus, BrowserPushSubscriptionStatus, PushDeliveryKind, PushDeliveryStatus, UserStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { BrowserPushSubscriptionService } from "@/services/browser-push-subscriptions";
import { getWebPushConfiguration } from "@/lib/web-push-config";
import { AnnouncementPushService } from "@/services/announcement-push";
import { MarketingPushService } from "@/services/marketing-push";
import { resolveMarketingDestination } from "@/services/marketing-notifications";
import { marketingConsentEligible, marketingSettingsWhere } from "@/lib/marketing-campaign-eligibility";
import { NativePushDeliveryService, nativePushEnabled } from "@/services/native-push-delivery";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;
const STALE_LOCK_MS = 10 * 60_000;
const INVOCATION_BUDGET_MS = 20_000;
const SEND_TIMEOUT_MS = 5_000;
const transientStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
const INTERNAL_PATH = /^\/(?!\/)[A-Za-z0-9/_?=&.%-]*$/;
const safePath = (value?: string | null) => value && value.trim().length <= 500 && INTERNAL_PATH.test(value.trim()) ? value.trim() : null;

function retryAt(attempt: number) {
  return new Date(Date.now() + Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, attempt - 1)));
}

function responseStatus(error: unknown) {
  return typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : undefined;
}

function notificationTag(job: { kind: PushDeliveryKind; notificationId: string | null; id: string }) {
  if (job.kind === PushDeliveryKind.TEST) return "mwezora-push-test";
  if (job.kind !== PushDeliveryKind.TRANSACTIONAL || !job.notificationId) return null;
  // Stable across retries without putting database identifiers in the payload.
  return `mwezora:transactional:${createHash("sha256").update(job.notificationId).digest("hex").slice(0, 24)}`;
}

export type PushOutboxDatabase = Pick<Prisma.TransactionClient, "pushDeliveryOutbox">;

export class PushTestDeliveryError extends Error {
  constructor(message: string, public code: "UNAVAILABLE" | "NO_ACTIVE_SUBSCRIPTION" | "OWNERSHIP_CONFLICT" | "CONFLICT" = "CONFLICT") {
    super(message);
  }
}

const testTitle = "Mwezora notifications are working";
const testMessage = "Your device is ready to receive important updates from Mwezora.";
const testPath = "/notifications";

function testDeliveryStatus(status: PushDeliveryStatus) {
  if (status === PushDeliveryStatus.DELIVERED) return "ACCEPTED" as const;
  if (status === PushDeliveryStatus.FAILED) return "FAILED" as const;
  if (status === PushDeliveryStatus.SKIPPED) return "EXPIRED" as const;
  if (status === PushDeliveryStatus.PROCESSING) return "PROCESSING" as const;
  return "QUEUED" as const;
}

export class PushDeliveryOutboxService {
  static async enqueueTransactional(input: { notificationId: string; idempotencyKey: string; userId: string; title: string; message: string; actionPath?: string | null }, database: PushOutboxDatabase) {
    if (!getWebPushConfiguration() && !nativePushEnabled()) return null;
    return database.pushDeliveryOutbox.upsert({
      where: { notificationId: input.notificationId },
      update: {},
      create: { idempotencyKey: `push:${input.idempotencyKey}`, notificationId: input.notificationId, userId: input.userId, kind: PushDeliveryKind.TRANSACTIONAL, title: input.title, message: input.message, actionPath: safePath(input.actionPath) },
    });
  }

  /**
   * A test is not a business notification. It is a durable, target-device-only
   * outbox entry created after proving the endpoint belongs to this account.
   */
  static async enqueueTest(input: { userId: string; endpointHash: string; requestId: string }) {
    if (!getWebPushConfiguration()) {
      throw new PushTestDeliveryError("Push delivery is unavailable right now. Please try again shortly.", "UNAVAILABLE");
    }

    const idempotencyKey = `push-test:${input.userId}:${input.requestId}`;
    return prisma.$transaction(async (database) => {
      const subscription = await database.browserPushSubscription.findUnique({
        where: { endpointHash: input.endpointHash },
        select: { id: true, userId: true, status: true, registrationVersion: true },
      });
      if (!subscription || subscription.status !== BrowserPushSubscriptionStatus.ACTIVE) {
        throw new PushTestDeliveryError("This device does not have active notifications. Enable notifications and try again.", "NO_ACTIVE_SUBSCRIPTION");
      }
      if (subscription.userId !== input.userId) {
        throw new PushTestDeliveryError("This browser is enabled for another Mwezora account.", "OWNERSHIP_CONFLICT");
      }

      const existing = await database.pushDeliveryOutbox.findUnique({
        where: { idempotencyKey },
        select: { id: true, userId: true, targetSubscriptionId: true, status: true },
      });
      if (existing) {
        if (existing.userId !== input.userId || existing.targetSubscriptionId !== subscription.id) {
          throw new PushTestDeliveryError("This test request conflicts with another device.", "CONFLICT");
        }
        return { requestId: input.requestId, status: testDeliveryStatus(existing.status) };
      }

      const job = await database.pushDeliveryOutbox.create({
        data: {
          idempotencyKey,
          userId: input.userId,
          targetSubscriptionId: subscription.id,
          targetSubscriptionVersion: subscription.registrationVersion,
          kind: PushDeliveryKind.TEST,
          title: testTitle,
          message: testMessage,
          actionPath: testPath,
        },
        select: { status: true },
      });
      return { requestId: input.requestId, status: testDeliveryStatus(job.status) };
    });
  }

  static async testStatus(input: { userId: string; requestId: string }) {
    const job = await prisma.pushDeliveryOutbox.findUnique({
      where: { idempotencyKey: `push-test:${input.userId}:${input.requestId}` },
      select: { userId: true, kind: true, status: true },
    });
    if (!job || job.userId !== input.userId || job.kind !== PushDeliveryKind.TEST) {
      throw new PushTestDeliveryError("Test notification request was not found.", "NO_ACTIVE_SUBSCRIPTION");
    }
    return { requestId: input.requestId, status: testDeliveryStatus(job.status) };
  }

  static async run(now = new Date()) {
    const fanout = await AnnouncementPushService.runFanout(now);
    const marketingFanout = await MarketingPushService.runFanout(now);
    if (!getWebPushConfiguration() && !nativePushEnabled()) return { claimed: 0, delivered: 0, retried: 0, failed: 0, skipped: 0, disabled: true, fanout, marketingFanout };
    await prisma.pushDeliveryOutbox.updateMany({
      where: { status: PushDeliveryStatus.PROCESSING, lockedAt: { lt: new Date(now.getTime() - STALE_LOCK_MS) } },
      data: { status: PushDeliveryStatus.RETRYING, lockedAt: null, lockToken: null, nextAttemptAt: now, failureCode: "WORKER_LOCK_EXPIRED", lastFailureAt: now },
    });
    const candidates = await prisma.pushDeliveryOutbox.findMany({ where: { status: { in: [PushDeliveryStatus.PENDING, PushDeliveryStatus.RETRYING] }, nextAttemptAt: { lte: now } }, orderBy: { nextAttemptAt: "asc" }, take: BATCH_SIZE, select: { id: true } });
    const token = randomUUID();
    const deadline = Date.now() + INVOCATION_BUDGET_MS;
    const results = { claimed: 0, delivered: 0, retried: 0, failed: 0, skipped: 0, disabled: false };
    for (const candidate of candidates) {
      if (Date.now() >= deadline) break;
      const update = await prisma.pushDeliveryOutbox.updateMany({ where: { id: candidate.id, status: { in: [PushDeliveryStatus.PENDING, PushDeliveryStatus.RETRYING] }, nextAttemptAt: { lte: now } }, data: { status: PushDeliveryStatus.PROCESSING, lockedAt: now, lockToken: token, attempts: { increment: 1 } } });
      if (!update.count) continue;
      results.claimed += 1;
      const result = await this.deliverClaim(candidate.id, token, deadline);
      results[result] += 1;
    }
    return { ...results, fanout, marketingFanout };
  }

  private static async deliverClaim(id: string, token: string, deadline: number): Promise<"delivered" | "retried" | "failed" | "skipped"> {
    const job = await prisma.pushDeliveryOutbox.findFirst({ where: { id, status: PushDeliveryStatus.PROCESSING, lockToken: token }, include: { notification: { select: { eventType: true } }, announcement: true, marketingCampaign: true, user: { select: { status: true, deletedAt: true, settings: { select: { promotionalInAppNotifications: true, promotionalPushNotifications: true, shoppingRecommendations: true } }, browserPushSubscriptions: { where: { status: BrowserPushSubscriptionStatus.ACTIVE }, select: { id: true, registrationVersion: true, endpointEncrypted: true, p256dhEncrypted: true, authEncrypted: true } } } } } });
    if (!job) return "skipped";
    if (job.announcementId) {
      const valid = job.announcement?.pushEnabled && job.announcement.status === AnnouncementStatus.PUBLISHED && (!job.announcement.expiresAt || job.announcement.expiresAt > new Date()) && job.user.status === UserStatus.ACTIVE && !job.user.deletedAt && (job.announcement.contentClass !== AnnouncementContentClass.PROMOTIONAL || job.user.settings?.promotionalPushNotifications === true);
      if (!valid) {
        await this.finish(job.id, token, PushDeliveryStatus.SKIPPED, "ANNOUNCEMENT_INELIGIBLE");
        return "skipped";
      }
    }
    if (job.marketingCampaignId) {
      const campaign = job.marketingCampaign;
      const valid = campaign?.pushEnabled && campaign.status === AnnouncementStatus.PUBLISHED && !!campaign.publishedAt && campaign.publishedAt <= new Date() && (!campaign.expiresAt || campaign.expiresAt > new Date()) && job.user.status === UserStatus.ACTIVE && !job.user.deletedAt && marketingConsentEligible(job.user.settings, campaign.audience, true);
      if (!valid) { await this.finish(job.id, token, PushDeliveryStatus.SKIPPED, "MARKETING_CAMPAIGN_INELIGIBLE"); return "skipped"; }
      try { await resolveMarketingDestination(campaign.destinationType, campaign.destinationReference); }
      catch { await this.finish(job.id, token, PushDeliveryStatus.SKIPPED, "MARKETING_DESTINATION_UNAVAILABLE"); return "skipped"; }
    }
    const native = await NativePushDeliveryService.deliver(job);
    // A TEST job is bound to exactly the subscription that was ownership-checked
    // when it was enqueued. A status change or account reassignment makes it skip.
    const subscriptions = job.targetSubscriptionId
      ? job.user.browserPushSubscriptions.filter((subscription) => subscription.id === job.targetSubscriptionId && subscription.registrationVersion === job.targetSubscriptionVersion)
      : job.user.browserPushSubscriptions;
    if (!subscriptions.length) {
      if (native.transient) return this.retryOrFail(job.id, token, job.attempts, "NATIVE_PUSH_TRANSPORT_FAILURE");
      if (native.delivered) { await this.finish(job.id, token, PushDeliveryStatus.DELIVERED); return "delivered"; }
      await this.finish(job.id, token, PushDeliveryStatus.SKIPPED, "NO_VALID_SUBSCRIPTIONS");
      return "skipped";
    }
    const config = getWebPushConfiguration();
    if (!config) {
      if (native.transient) return this.retryOrFail(job.id, token, job.attempts, "NATIVE_PUSH_TRANSPORT_FAILURE");
      if (native.delivered) { await this.finish(job.id, token, PushDeliveryStatus.DELIVERED); return "delivered"; }
      await this.finish(job.id, token, PushDeliveryStatus.SKIPPED, "WEB_PUSH_CONFIGURATION_UNAVAILABLE");
      return "skipped";
    }
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    const tag = job.announcementId ? AnnouncementPushService.notificationTag(job.announcementId) : job.marketingCampaignId ? MarketingPushService.notificationTag(job.marketingCampaignId) : notificationTag(job);
    const payload = JSON.stringify({ title: job.title, body: job.message, path: safePath(job.actionPath) ?? "/notifications", ...(tag ? { tag } : {}) });
    let sent = 0;
    let transient = false;
    for (const subscription of subscriptions) {
      if (Date.now() >= deadline) {
        if (!sent) return this.retryOrFail(job.id, token, job.attempts, "WORKER_TIME_BUDGET");
        break;
      }
      if (job.announcementId) {
        const eligible = await prisma.browserPushSubscription.findFirst({
          where: {
            id: subscription.id,
            userId: job.userId,
            status: BrowserPushSubscriptionStatus.ACTIVE,
            registrationVersion: subscription.registrationVersion,
            user: {
              status: UserStatus.ACTIVE,
              deletedAt: null,
              ...(job.announcement?.contentClass === AnnouncementContentClass.PROMOTIONAL ? { settings: { promotionalPushNotifications: true } } : {}),
            },
          },
          select: { id: true },
        });
        const activeAnnouncement = await prisma.announcement.count({ where: { id: job.announcementId, pushEnabled: true, status: AnnouncementStatus.PUBLISHED, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
        if (!eligible || !activeAnnouncement) continue;
      }
      if (job.marketingCampaignId) {
        const eligible = await prisma.browserPushSubscription.findFirst({
          where: { id: subscription.id, userId: job.userId, status: BrowserPushSubscriptionStatus.ACTIVE, registrationVersion: subscription.registrationVersion, user: { status: UserStatus.ACTIVE, deletedAt: null, settings: marketingSettingsWhere(job.marketingCampaign!.audience, true) } },
          select: { id: true },
        });
        const activeCampaign = await prisma.marketingNotificationCampaign.count({ where: { id: job.marketingCampaignId, pushEnabled: true, status: AnnouncementStatus.PUBLISHED, publishedAt: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], userStates: { some: { userId: job.userId } } } });
        if (!eligible || !activeCampaign) continue;
      }
      try {
        await webpush.sendNotification(BrowserPushSubscriptionService.decode(subscription), payload, { TTL: 60 * 60, urgency: "normal", timeout: Math.min(SEND_TIMEOUT_MS, Math.max(1, deadline - Date.now())) });
        sent += 1;
        await prisma.browserPushSubscription.update({ where: { id: subscription.id }, data: { lastSuccessAt: new Date(), failureCount: 0 } });
      } catch (error) {
        const status = responseStatus(error);
        if (status === 404 || status === 410) {
          await prisma.browserPushSubscription.update({ where: { id: subscription.id }, data: { status: BrowserPushSubscriptionStatus.REVOKED, revokedAt: new Date(), lastFailureAt: new Date(), failureCount: { increment: 1 } } });
        } else {
          transient ||= !status || transientStatuses.has(status);
          await prisma.browserPushSubscription.update({ where: { id: subscription.id }, data: { lastFailureAt: new Date(), failureCount: { increment: 1 } } });
        }
      }
    }
    if (transient || native.transient) return this.retryOrFail(job.id, token, job.attempts, "PUSH_TRANSPORT_FAILURE");
    if (sent || native.delivered) { await this.finish(job.id, token, PushDeliveryStatus.DELIVERED); return "delivered"; }
    await this.finish(job.id, token, PushDeliveryStatus.SKIPPED, "NO_VALID_SUBSCRIPTIONS");
    return "skipped";
  }

  private static async finish(id: string, token: string, status: PushDeliveryStatus, failureCode?: string) {
    await prisma.pushDeliveryOutbox.updateMany({ where: { id, status: PushDeliveryStatus.PROCESSING, lockToken: token }, data: { status, lockToken: null, lockedAt: null, deliveredAt: status === PushDeliveryStatus.DELIVERED ? new Date() : undefined, failureCode: failureCode ?? null, lastFailureAt: failureCode ? new Date() : null } });
  }

  private static async retryOrFail(id: string, token: string, attempts: number, failureCode: string): Promise<"retried" | "failed"> {
    const status = attempts >= MAX_ATTEMPTS ? PushDeliveryStatus.FAILED : PushDeliveryStatus.RETRYING;
    await prisma.pushDeliveryOutbox.updateMany({ where: { id, status: PushDeliveryStatus.PROCESSING, lockToken: token }, data: { status, lockToken: null, lockedAt: null, nextAttemptAt: status === PushDeliveryStatus.RETRYING ? retryAt(attempts) : new Date(), failureCode, lastFailureAt: new Date() } });
    return status === PushDeliveryStatus.RETRYING ? "retried" : "failed";
  }
}
