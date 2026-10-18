import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ adminId: "marketing-acceptance-admin" }));
const transport = vi.hoisted(() => ({ send: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/auth/admin-context", () => ({
  requireAdminContext: async () => ({ userId: auth.adminId, platformRole: "ADMIN" }),
  AdminAuthorizationError: class AdminAuthorizationError extends Error {},
}));
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: transport.send } }));

import {
  AnnouncementPushDispatchStatus,
  AnnouncementStatus,
  BrowserPushSubscriptionStatus,
  MarketingDestinationType,
  MarketingNotificationAudience,
  MarketingNotificationCategory,
  PlatformRole,
  PushDeliveryStatus,
  UserStatus,
} from "@prisma/client";
import { MARKETING_DAILY_LIMIT } from "@/lib/marketing-notification-policy";
import { prisma } from "@/lib/prisma/client";
import { encryptPushSubscriptionValue } from "@/lib/web-push-config";
import { MarketingNotificationService } from "@/services/marketing-notifications";
import { MarketingPushService } from "@/services/marketing-push";
import { PushDeliveryOutboxService } from "@/services/push-delivery-outbox";
import { SettingsService } from "@/services/settings";

const enabled = process.env.RUN_CUSTOMER_ORDERS_DB_TESTS === "1";
const ids = { admin: auth.adminId, customerA: "customer-a", customerB: "customer-b" };
const marker = `p3d-${randomUUID()}`;

async function assertSafeTarget() {
  const configured = process.env.DATABASE_URL;
  if (process.env.CUSTOMER_ORDERS_TEST_DATABASE !== "isolated-local" || !configured) throw new Error("Refusing P3D fixtures without the isolated marker.");
  const target = new URL(configured);
  if (target.hostname !== "127.0.0.1" || target.pathname !== "/mwezora_customer_orders_tests") throw new Error("Refusing P3D tests outside disposable PostgreSQL.");
}

async function campaign(input: { pushEnabled?: boolean; status?: AnnouncementStatus; audience?: MarketingNotificationAudience; publishedAt?: Date | null; scheduledAt?: Date | null; expiresAt?: Date | null } = {}) {
  return prisma.marketingNotificationCampaign.create({ data: {
    name: `${marker} campaign`, title: "Fresh finds on Mwezora", message: "Explore new arrivals from shops you may like.",
    category: MarketingNotificationCategory.OFFERS,
    audience: input.audience ?? MarketingNotificationAudience.PROMOTIONAL_OPT_IN,
    destinationType: MarketingDestinationType.HOME,
    destinationPath: "/",
    pushEnabled: input.pushEnabled ?? true,
    status: input.status ?? AnnouncementStatus.PUBLISHED,
    publishedAt: input.publishedAt === undefined ? new Date() : input.publishedAt,
    scheduledAt: input.scheduledAt,
    expiresAt: input.expiresAt,
    createdById: ids.admin,
    publishedById: ids.admin,
  } });
}

async function activeSubscription(userId: string, suffix: string) {
  const endpoint = `https://push.acceptance.invalid/${marker}/${suffix}`;
  return prisma.browserPushSubscription.create({ data: {
    userId,
    endpointHash: `${marker}-${suffix}`.padEnd(64, "0").slice(0, 64),
    endpointEncrypted: encryptPushSubscriptionValue(endpoint),
    p256dhEncrypted: encryptPushSubscriptionValue(`p256dh-${suffix}`),
    authEncrypted: encryptPushSubscriptionValue(`auth-${suffix}`),
    status: BrowserPushSubscriptionStatus.ACTIVE,
  } });
}

describe.skipIf(!enabled).sequential("P3D marketing push against isolated PostgreSQL", () => {
  beforeAll(async () => {
    await assertSafeTarget();
    await prisma.user.create({ data: { id: ids.admin, name: "Marketing Acceptance Admin", email: "marketing-admin@orders.test", status: UserStatus.ACTIVE, platformRole: PlatformRole.ADMIN } });
    await SettingsService.updateSettings(ids.customerA, { promotionalInAppNotifications: true, promotionalPushNotifications: true, shoppingRecommendations: false });
    await SettingsService.updateSettings(ids.customerB, { promotionalInAppNotifications: true, promotionalPushNotifications: false, shoppingRecommendations: false });
    await activeSubscription(ids.customerA, "a-one");
    await activeSubscription(ids.customerA, "a-two");
    await activeSubscription(ids.customerB, "b-one");
  });

  beforeEach(async () => {
    transport.send.mockClear();
    await prisma.marketingNotificationCampaign.deleteMany({ where: { createdById: ids.admin } });
    await prisma.userSettings.update({ where: { userId: ids.customerA }, data: { promotionalInAppNotifications: true, promotionalPushNotifications: true, shoppingRecommendations: false } });
    await prisma.userSettings.update({ where: { userId: ids.customerB }, data: { promotionalInAppNotifications: true, promotionalPushNotifications: false, shoppingRecommendations: false } });
    await prisma.browserPushSubscription.updateMany({ where: { userId: { in: [ids.customerA, ids.customerB] } }, data: { status: BrowserPushSubscriptionStatus.ACTIVE, revokedAt: null } });
    await prisma.user.updateMany({ where: { id: { in: [ids.customerA, ids.customerB] } }, data: { status: UserStatus.ACTIVE, deletedAt: null } });
  });

  afterAll(async () => { await prisma.$disconnect(); });

  it("applies migration defaults and persists explicit consent independently", async () => {
    const existing = await campaign({ pushEnabled: false, status: AnnouncementStatus.DRAFT, publishedAt: null });
    expect(existing.pushEnabled).toBe(false);
    await prisma.userSettings.delete({ where: { userId: ids.customerB } });
    expect(await SettingsService.getSettings(ids.customerB)).toMatchObject({ promotionalInAppNotifications: false, promotionalPushNotifications: false });
    expect(await SettingsService.updateSettings(ids.customerB, { promotionalPushNotifications: true })).toMatchObject({ promotionalInAppNotifications: false, promotionalPushNotifications: true });
    expect(await SettingsService.updateSettings(ids.customerB, { promotionalPushNotifications: false })).toMatchObject({ promotionalPushNotifications: false });
  });

  it("publishes durable intent and creates one job per active owned subscription with one frequency reservation", async () => {
    const draft = await MarketingNotificationService.create({ name: `${marker} publication`, title: "Fresh finds", message: "Explore Mwezora offers.", category: MarketingNotificationCategory.OFFERS, audience: MarketingNotificationAudience.PROMOTIONAL_OPT_IN, destinationType: MarketingDestinationType.HOME, pushEnabled: true });
    expect(await prisma.marketingPushDispatch.count({ where: { campaignId: draft.id } })).toBe(0);
    await MarketingNotificationService.publish(draft.id);
    expect(await prisma.marketingPushDispatch.findUnique({ where: { campaignId: draft.id } })).toMatchObject({ status: AnnouncementPushDispatchStatus.PENDING, cursorUserId: null });
    expect(await MarketingPushService.runFanout()).toMatchObject({ processed: 1, eligible: 1, queued: 2 });
    await MarketingPushService.runFanout();
    expect(await prisma.marketingNotificationUserState.count({ where: { campaignId: draft.id, userId: ids.customerA } })).toBe(1);
    expect(await prisma.pushDeliveryOutbox.count({ where: { marketingCampaignId: draft.id, userId: ids.customerA } })).toBe(2);
    expect(await prisma.pushDeliveryOutbox.count({ where: { marketingCampaignId: draft.id, userId: ids.customerB } })).toBe(0);
    expect(await prisma.marketingPushDispatch.findUnique({ where: { campaignId: draft.id } })).toMatchObject({ status: AnnouncementPushDispatchStatus.COMPLETED, processedRecipients: 1, eligibleRecipients: 1, queuedJobs: 2 });
  });

  it("shares one allowance across in-app, push, devices, retries, and duplicate fan-out", async () => {
    const row = await campaign();
    await prisma.marketingNotificationUserState.create({ data: { campaignId: row.id, userId: ids.customerA } });
    await prisma.marketingPushDispatch.create({ data: { campaignId: row.id } });
    await MarketingPushService.runFanout();
    await prisma.marketingPushDispatch.update({ where: { campaignId: row.id }, data: { status: AnnouncementPushDispatchStatus.PROCESSING, lockedAt: null, cursorUserId: null } });
    await MarketingPushService.runFanout();
    expect(await prisma.marketingNotificationUserState.count({ where: { campaignId: row.id, userId: ids.customerA } })).toBe(1);
    expect(await prisma.pushDeliveryOutbox.count({ where: { marketingCampaignId: row.id } })).toBe(2);
    await prisma.pushDeliveryOutbox.updateMany({ where: { marketingCampaignId: row.id }, data: { status: PushDeliveryStatus.RETRYING, nextAttemptAt: new Date() } });
    expect(await prisma.marketingNotificationUserState.count({ where: { userId: ids.customerA } })).toBe(1);
  });

  it("enforces the rolling cap across distinct campaigns under concurrent workers and ignores expired reservations", async () => {
    const expiredReservation = await campaign({ pushEnabled: false });
    await prisma.marketingNotificationUserState.create({ data: { campaignId: expiredReservation.id, userId: ids.customerA, deliveredAt: new Date(Date.now() - 25 * 60 * 60_000) } });
    const rows = await Promise.all(Array.from({ length: MARKETING_DAILY_LIMIT + 2 }, () => campaign()));
    await prisma.marketingPushDispatch.createMany({ data: rows.map(({ id }) => ({ campaignId: id })) });
    await Promise.all([MarketingPushService.runFanout(), MarketingPushService.runFanout(), MarketingPushService.runFanout()]);
    expect(await prisma.marketingNotificationUserState.count({ where: { userId: ids.customerA, deliveredAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } } })).toBe(MARKETING_DAILY_LIMIT);
    expect(await prisma.pushDeliveryOutbox.count({ where: { userId: ids.customerA, marketingCampaignId: { in: rows.map(({ id }) => id) } } })).toBe(MARKETING_DAILY_LIMIT * 2);
  });

  it("waits for lifecycle eligibility and stops cancellation, expiry, and revoked consent", async () => {
    const draft = await campaign({ status: AnnouncementStatus.DRAFT, publishedAt: null });
    const scheduled = await campaign({ status: AnnouncementStatus.SCHEDULED, publishedAt: null, scheduledAt: new Date(Date.now() + 60_000) });
    expect(await MarketingNotificationService.advanceLifecycle()).toMatchObject({ published: 0 });
    expect(await prisma.marketingPushDispatch.count({ where: { campaignId: { in: [draft.id, scheduled.id] } } })).toBe(0);

    const active = await campaign();
    await prisma.marketingPushDispatch.create({ data: { campaignId: active.id } });
    await MarketingPushService.runFanout();
    await MarketingNotificationService.cancel(active.id);
    expect(await prisma.pushDeliveryOutbox.count({ where: { marketingCampaignId: active.id, status: PushDeliveryStatus.SKIPPED } })).toBe(2);

    const expiring = await campaign({ expiresAt: new Date(Date.now() - 1000) });
    await prisma.marketingPushDispatch.create({ data: { campaignId: expiring.id } });
    await MarketingPushService.runFanout();
    expect(await prisma.marketingPushDispatch.findUnique({ where: { campaignId: expiring.id } })).toMatchObject({ status: AnnouncementPushDispatchStatus.EXPIRED });

    const revoked = await campaign();
    await prisma.marketingPushDispatch.create({ data: { campaignId: revoked.id } });
    await MarketingPushService.runFanout();
    await SettingsService.updateSettings(ids.customerA, { promotionalPushNotifications: false });
    expect(await prisma.pushDeliveryOutbox.count({ where: { marketingCampaignId: revoked.id, status: PushDeliveryStatus.SKIPPED } })).toBe(2);
  });

  it("rechecks disabled accounts and replaced registrations immediately before mocked transport", async () => {
    const row = await campaign();
    await prisma.marketingPushDispatch.create({ data: { campaignId: row.id } });
    await MarketingPushService.runFanout();
    const subscription = await prisma.browserPushSubscription.findFirstOrThrow({ where: { userId: ids.customerA } });
    await prisma.browserPushSubscription.update({ where: { id: subscription.id }, data: { registrationVersion: { increment: 1 } } });
    await prisma.user.update({ where: { id: ids.customerA }, data: { status: UserStatus.SUSPENDED } });
    const result = await PushDeliveryOutboxService.run();
    expect(result.skipped).toBeGreaterThanOrEqual(2);
    expect(transport.send.mock.calls.filter((call) => String(call[1]).includes("Fresh finds on Mwezora"))).toHaveLength(0);
    await prisma.user.update({ where: { id: ids.customerA }, data: { status: UserStatus.ACTIVE } });
  });

  it("delivers current subscription jobs once through the mocked transport and leaves browser history fixtures", async () => {
    const row = await campaign();
    await prisma.marketingPushDispatch.create({ data: { campaignId: row.id } });
    await MarketingPushService.runFanout();
    const result = await PushDeliveryOutboxService.run();
    expect(result).toMatchObject({ delivered: 2, failed: 0 });
    expect(transport.send).toHaveBeenCalledTimes(2);
    expect(await prisma.pushDeliveryOutbox.count({ where: { marketingCampaignId: row.id, status: PushDeliveryStatus.DELIVERED } })).toBe(2);
    await SettingsService.updateSettings(ids.customerA, { promotionalPushNotifications: false });
  });
});
