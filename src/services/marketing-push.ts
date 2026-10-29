import { createHash, randomUUID } from "node:crypto";
import {
  AnnouncementPushDispatchStatus,
  AnnouncementStatus,
  BrowserPushSubscriptionStatus,
  Prisma,
  PushDeliveryKind,
  PushDeliveryStatus,
  UserStatus,
} from "@prisma/client";
import { MARKETING_DAILY_LIMIT } from "@/lib/marketing-notification-policy";
import { marketingSettingsWhere } from "@/lib/marketing-campaign-eligibility";
import { prisma } from "@/lib/prisma/client";
import { resolveMarketingDestination } from "@/services/marketing-notifications";

const RECIPIENT_BATCH_SIZE = 100;
const DISPATCH_BATCH_SIZE = 5;
const STALE_LOCK_MS = 10 * 60_000;
const RESERVATION_RETRIES = 8;

function isSerializationConflict(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  )
    return true;
  if (!(error instanceof Error)) return false;
  const cause = "cause" in error ? String(error.cause) : "";
  return /TransactionWriteConflict|write conflict|could not serialize/i.test(
    `${error.name} ${error.message} ${cause}`,
  );
}

export class MarketingPushService {
  static async stopDispatches(campaignIds: string[], expired = false) {
    if (!campaignIds.length) return;
    const now = new Date();
    await prisma.$transaction([
      prisma.marketingPushDispatch.updateMany({
        where: {
          campaignId: { in: campaignIds },
          status: {
            in: [
              AnnouncementPushDispatchStatus.PENDING,
              AnnouncementPushDispatchStatus.PROCESSING,
            ],
          },
        },
        data: {
          status: expired
            ? AnnouncementPushDispatchStatus.EXPIRED
            : AnnouncementPushDispatchStatus.CANCELLED,
          cancelledAt: now,
          lockToken: null,
          lockedAt: null,
        },
      }),
      prisma.pushDeliveryOutbox.updateMany({
        where: {
          marketingCampaignId: { in: campaignIds },
          status: {
            in: [PushDeliveryStatus.PENDING, PushDeliveryStatus.RETRYING],
          },
        },
        data: {
          status: PushDeliveryStatus.SKIPPED,
          failureCode: expired
            ? "MARKETING_CAMPAIGN_EXPIRED"
            : "MARKETING_CAMPAIGN_CANCELLED",
          lastFailureAt: now,
        },
      }),
    ]);
  }

  static async runFanout(now = new Date()) {
    const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
    const candidates = await prisma.marketingPushDispatch.findMany({
      where: {
        OR: [
          { status: AnnouncementPushDispatchStatus.PENDING },
          {
            status: AnnouncementPushDispatchStatus.PROCESSING,
            OR: [{ lockedAt: null }, { lockedAt: { lt: staleBefore } }],
          },
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: DISPATCH_BATCH_SIZE,
      select: { id: true },
    });
    let processed = 0,
      eligible = 0,
      queued = 0,
      completed = 0;
    for (const candidate of candidates) {
      const token = randomUUID();
      const claimed = await prisma.marketingPushDispatch.updateMany({
        where: {
          id: candidate.id,
          OR: [
            { status: AnnouncementPushDispatchStatus.PENDING },
            {
              status: AnnouncementPushDispatchStatus.PROCESSING,
              OR: [{ lockedAt: null }, { lockedAt: { lt: staleBefore } }],
            },
          ],
        },
        data: {
          status: AnnouncementPushDispatchStatus.PROCESSING,
          lockToken: token,
          lockedAt: now,
          startedAt: now,
        },
      });
      if (!claimed.count) continue;
      const result = await this.processBatch(candidate.id, token, now);
      processed += result.processed;
      eligible += result.eligible;
      queued += result.queued;
      completed += result.completed ? 1 : 0;
    }
    return {
      dispatches: candidates.length,
      processed,
      eligible,
      queued,
      completed,
    };
  }

  private static async processBatch(id: string, token: string, now: Date) {
    const dispatch = await prisma.marketingPushDispatch.findFirst({
      where: {
        id,
        status: AnnouncementPushDispatchStatus.PROCESSING,
        lockToken: token,
      },
      include: { campaign: true },
    });
    if (!dispatch)
      return { processed: 0, eligible: 0, queued: 0, completed: false };
    const campaign = dispatch.campaign;
    if (
      !campaign.pushEnabled ||
      campaign.status !== AnnouncementStatus.PUBLISHED ||
      !campaign.publishedAt ||
      campaign.publishedAt > now
    ) {
      await this.finishInvalid(
        id,
        token,
        AnnouncementPushDispatchStatus.CANCELLED,
      );
      return { processed: 0, eligible: 0, queued: 0, completed: true };
    }
    if (campaign.expiresAt && campaign.expiresAt <= now) {
      await this.finishInvalid(
        id,
        token,
        AnnouncementPushDispatchStatus.EXPIRED,
      );
      return { processed: 0, eligible: 0, queued: 0, completed: true };
    }
    try {
      await resolveMarketingDestination(
        campaign.destinationType,
        campaign.destinationReference,
      );
    } catch {
      await this.finishInvalid(
        id,
        token,
        AnnouncementPushDispatchStatus.CANCELLED,
      );
      return { processed: 0, eligible: 0, queued: 0, completed: true };
    }

    const users = await prisma.user.findMany({
      where: {
        id: dispatch.cursorUserId ? { gt: dispatch.cursorUserId } : undefined,
        status: UserStatus.ACTIVE,
        deletedAt: null,
        settings: marketingSettingsWhere(campaign.audience, true),
        OR: [
          { browserPushSubscriptions: { some: { status: BrowserPushSubscriptionStatus.ACTIVE } } },
          { devices: { some: { enabled: true, platform: "ANDROID" } } },
        ],
      },
      orderBy: { id: "asc" },
      take: RECIPIENT_BATCH_SIZE,
      select: {
        id: true,
        browserPushSubscriptions: {
          where: { status: BrowserPushSubscriptionStatus.ACTIVE },
          select: { id: true, registrationVersion: true },
        },
        devices: {
          where: { enabled: true, platform: "ANDROID" },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!users.length) {
      await prisma.marketingPushDispatch.updateMany({
        where: { id, lockToken: token },
        data: {
          status: AnnouncementPushDispatchStatus.COMPLETED,
          completedAt: now,
          lockedAt: null,
          lockToken: null,
        },
      });
      return { processed: 0, eligible: 0, queued: 0, completed: true };
    }

    let eligible = 0,
      queued = 0;
    for (const user of users) {
      const result = await this.reserveAndQueue(campaign.id, user, now);
      if (result.eligible) eligible += 1;
      queued += result.queued;
    }
    await prisma.marketingPushDispatch.updateMany({
      where: {
        id,
        lockToken: token,
        status: AnnouncementPushDispatchStatus.PROCESSING,
      },
      data: {
        cursorUserId: users.at(-1)!.id,
        processedRecipients: { increment: users.length },
        eligibleRecipients: { increment: eligible },
        queuedJobs: { increment: queued },
        lockedAt: null,
        lockToken: null,
      },
    });
    return { processed: users.length, eligible, queued, completed: false };
  }

  private static async reserveAndQueue(
    campaignId: string,
    user: {
      id: string;
      browserPushSubscriptions: { id: string; registrationVersion: number }[];
      devices: { id: string }[];
    },
    now: Date,
  ) {
    for (let attempt = 0; attempt < RESERVATION_RETRIES; attempt += 1) {
      try {
        return await prisma.$transaction(
          async (tx) => {
            const campaign = await tx.marketingNotificationCampaign.findFirst({
              where: {
                id: campaignId,
                pushEnabled: true,
                status: AnnouncementStatus.PUBLISHED,
                publishedAt: { lte: now },
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            });
            if (!campaign) return { eligible: false, queued: 0 };
            const existing = await tx.marketingNotificationUserState.findUnique(
              {
                where: { campaignId_userId: { campaignId, userId: user.id } },
                select: { id: true },
              },
            );
            if (!existing) {
              const delivered = await tx.marketingNotificationUserState.count({
                where: {
                  userId: user.id,
                  deliveredAt: { gte: new Date(now.getTime() - 86_400_000) },
                },
              });
              if (delivered >= MARKETING_DAILY_LIMIT)
                return { eligible: false, queued: 0 };
              await tx.marketingNotificationUserState.create({
                data: { campaignId, userId: user.id, deliveredAt: now },
              });
            }
            const result = await tx.pushDeliveryOutbox.createMany({
              data: [
                ...user.browserPushSubscriptions.map((subscription) => ({
                idempotencyKey: `push:marketing:${campaignId}:${subscription.id}:${subscription.registrationVersion}`,
                marketingCampaignId: campaignId,
                userId: user.id,
                targetSubscriptionId: subscription.id,
                targetSubscriptionVersion: subscription.registrationVersion,
                kind: PushDeliveryKind.MARKETING,
                title: campaign.title,
                message: campaign.message.slice(0, 1000),
                actionPath: campaign.destinationPath,
                })),
                ...(user.devices.length ? [{
                  idempotencyKey: `push:marketing:${campaignId}:${user.id}:native`,
                  marketingCampaignId: campaignId,
                  userId: user.id,
                  kind: PushDeliveryKind.MARKETING,
                  title: campaign.title,
                  message: campaign.message.slice(0, 1000),
                  actionPath: campaign.destinationPath,
                }] : []),
              ],
              skipDuplicates: true,
            });
            return { eligible: true, queued: result.count };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          !isSerializationConflict(error) ||
          attempt === RESERVATION_RETRIES - 1
        )
          throw error;
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            5 * (attempt + 1) + Math.floor(Math.random() * 8),
          ),
        );
      }
    }
    return { eligible: false, queued: 0 };
  }

  private static async finishInvalid(
    id: string,
    token: string,
    status: AnnouncementPushDispatchStatus,
  ) {
    await prisma.marketingPushDispatch.updateMany({
      where: { id, lockToken: token },
      data: {
        status,
        cancelledAt: new Date(),
        lockedAt: null,
        lockToken: null,
      },
    });
  }

  static notificationTag(campaignId: string) {
    return `mwezora:marketing:${createHash("sha256").update(campaignId).digest("hex").slice(0, 24)}`;
  }
}
