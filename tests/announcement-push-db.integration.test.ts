import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AnnouncementAudience, AnnouncementCategory, AnnouncementContentClass, AnnouncementPriority, AnnouncementPushDispatchStatus, AnnouncementStatus, BrowserPushSubscriptionStatus, PlatformRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { AnnouncementPushService } from "@/services/announcement-push";
import { AnnouncementService } from "@/services/announcements";

const enabled = process.env.RUN_CUSTOMER_ORDERS_DB_TESTS === "1";
const marker = `p3c-${randomUUID()}`;
const ids = { admin: `${marker}-admin`, customer: `${marker}-customer`, optedIn: `${marker}-opted`, vendor: `${marker}-vendor` };

describe.skipIf(!enabled)("P3C announcement push database integration", () => {
  beforeAll(async () => {
    await prisma.user.createMany({ data: [
      { id: ids.admin, name: "P3C Admin", email: `${ids.admin}@test.invalid`, status: UserStatus.ACTIVE, platformRole: PlatformRole.ADMIN },
      { id: ids.customer, name: "P3C Customer", email: `${ids.customer}@test.invalid`, status: UserStatus.ACTIVE, platformRole: PlatformRole.CUSTOMER },
      { id: ids.optedIn, name: "P3C Opted In", email: `${ids.optedIn}@test.invalid`, status: UserStatus.ACTIVE, platformRole: PlatformRole.CUSTOMER },
      { id: ids.vendor, name: "P3C Vendor", email: `${ids.vendor}@test.invalid`, status: UserStatus.ACTIVE, platformRole: PlatformRole.VENDOR },
    ] });
    await prisma.userSettings.createMany({ data: [
      { userId: ids.customer, promotionalPushNotifications: false },
      { userId: ids.optedIn, promotionalPushNotifications: true },
      { userId: ids.vendor, promotionalPushNotifications: true },
    ] });
    await prisma.browserPushSubscription.createMany({ data: [ids.admin, ids.customer, ids.optedIn, ids.vendor].map((userId, index) => ({ userId, endpointHash: `${marker}-${index}`.padEnd(64, "0").slice(0, 64), endpointEncrypted: "test", p256dhEncrypted: "test", authEncrypted: "test", status: BrowserPushSubscriptionStatus.ACTIVE })) });
  });

  afterAll(async () => {
    await prisma.announcement.deleteMany({ where: { createdById: ids.admin } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  });

  it("publishes scheduled push intent and fans out only to authoritative eligible accounts", async () => {
    const announcement = await prisma.announcement.create({ data: { title: "Scheduled maintenance", message: "Mwezora will undergo scheduled maintenance tonight.", category: AnnouncementCategory.OPERATIONS, priority: AnnouncementPriority.IMPORTANT, audience: AnnouncementAudience.CUSTOMERS, contentClass: AnnouncementContentClass.ESSENTIAL, pushEnabled: true, status: AnnouncementStatus.SCHEDULED, scheduledAt: new Date(Date.now() - 1000), createdById: ids.admin, publishedById: ids.admin } });
    expect(await AnnouncementService.advanceLifecycle()).toMatchObject({ published: 1 });
    expect(await prisma.announcementPushDispatch.findUnique({ where: { announcementId: announcement.id } })).toMatchObject({ status: AnnouncementPushDispatchStatus.PENDING, cursorUserId: null });
    expect(await AnnouncementPushService.runFanout()).toMatchObject({ processed: 2, queued: 2 });
    expect(await prisma.pushDeliveryOutbox.count({ where: { announcementId: announcement.id } })).toBe(2);
    await AnnouncementPushService.runFanout();
    expect(await prisma.announcementPushDispatch.findUnique({ where: { announcementId: announcement.id } })).toMatchObject({ status: AnnouncementPushDispatchStatus.COMPLETED, processedRecipients: 2, queuedRecipients: 2 });
  });

  it("requires promotional push opt-in and remains idempotent when fan-out resumes", async () => {
    const announcement = await prisma.announcement.create({ data: { title: "New marketplace collection", message: "Explore this week's collection.", category: AnnouncementCategory.PRODUCT, priority: AnnouncementPriority.NORMAL, audience: AnnouncementAudience.CUSTOMERS, contentClass: AnnouncementContentClass.PROMOTIONAL, pushEnabled: true, status: AnnouncementStatus.PUBLISHED, publishedAt: new Date(), createdById: ids.admin, publishedById: ids.admin, pushDispatch: { create: {} } } });
    expect(await AnnouncementPushService.runFanout()).toMatchObject({ processed: 1, queued: 1 });
    await prisma.announcementPushDispatch.update({ where: { announcementId: announcement.id }, data: { status: AnnouncementPushDispatchStatus.PROCESSING, lockedAt: null, cursorUserId: null } });
    await AnnouncementPushService.runFanout();
    expect(await prisma.pushDeliveryOutbox.count({ where: { announcementId: announcement.id, userId: ids.optedIn } })).toBe(1);
    expect(await prisma.pushDeliveryOutbox.count({ where: { announcementId: announcement.id, userId: ids.customer } })).toBe(0);
  });

  it("restricts the acceptance announcement to isolated test administrators and is concurrency-safe", async () => {
    const announcement = await prisma.announcement.create({ data: { title: "Mwezora notification test", message: "This is a test of Mwezora's platform announcement notifications.", category: AnnouncementCategory.OPERATIONS, priority: AnnouncementPriority.IMPORTANT, audience: AnnouncementAudience.ADMINISTRATORS, contentClass: AnnouncementContentClass.ESSENTIAL, pushEnabled: true, status: AnnouncementStatus.PUBLISHED, publishedAt: new Date(), createdById: ids.admin, publishedById: ids.admin, pushDispatch: { create: {} } } });
    await Promise.all([AnnouncementPushService.runFanout(), AnnouncementPushService.runFanout()]);
    expect(await prisma.pushDeliveryOutbox.findMany({ where: { announcementId: announcement.id }, select: { userId: true } })).toEqual([{ userId: ids.admin }]);
  });

  it("does not dispatch drafts, disabled push, or future scheduled announcements and stops cancelled work", async () => {
    const base = { message: "This announcement must not create recipient jobs.", category: AnnouncementCategory.OPERATIONS, priority: AnnouncementPriority.NORMAL, audience: AnnouncementAudience.CUSTOMERS, contentClass: AnnouncementContentClass.ESSENTIAL, createdById: ids.admin };
    const [draft, disabled, scheduled] = await Promise.all([
      prisma.announcement.create({ data: { ...base, title: "Draft announcement", pushEnabled: true, status: AnnouncementStatus.DRAFT } }),
      prisma.announcement.create({ data: { ...base, title: "Push disabled", pushEnabled: false, status: AnnouncementStatus.PUBLISHED, publishedAt: new Date() } }),
      prisma.announcement.create({ data: { ...base, title: "Future scheduled", pushEnabled: true, status: AnnouncementStatus.SCHEDULED, scheduledAt: new Date(Date.now() + 60_000) } }),
    ]);
    expect(await AnnouncementService.advanceLifecycle()).toMatchObject({ published: 0 });
    expect(await prisma.announcementPushDispatch.count({ where: { announcementId: { in: [draft.id, disabled.id, scheduled.id] } } })).toBe(0);

    const cancelled = await prisma.announcement.create({ data: { ...base, title: "Cancelled push", pushEnabled: true, status: AnnouncementStatus.PUBLISHED, publishedAt: new Date(), pushDispatch: { create: {} } } });
    await AnnouncementPushService.stopDispatches([cancelled.id], AnnouncementPushDispatchStatus.CANCELLED);
    await AnnouncementPushService.runFanout();
    expect(await prisma.pushDeliveryOutbox.count({ where: { announcementId: cancelled.id } })).toBe(0);
  });
});
