import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("P3C platform announcement push", () => {
  it("defaults existing and new announcements to push disabled", () => {
    const schema = read("prisma/schema.prisma");
    const migration = read("prisma/migrations/20261018120000_announcement_push_dispatch/migration.sql");
    expect(schema).toMatch(/pushEnabled\s+Boolean\s+@default\(false\)/);
    expect(migration).toContain('"pushEnabled" BOOLEAN NOT NULL DEFAULT false');
  });

  it("creates dispatch intent only at authoritative publication", () => {
    const service = read("src/services/announcements.ts");
    const create = service.slice(service.indexOf("static async create"), service.indexOf("static async update"));
    expect(create).not.toContain("announcementPushDispatch");
    expect(service).toContain("if (!scheduled && current.pushEnabled) await tx.announcementPushDispatch.upsert");
    expect(service).toContain("announcementPushDispatch.createMany");
  });

  it("uses a durable resumable cursor and bounded keyset fan-out", () => {
    const schema = read("prisma/schema.prisma");
    const fanout = read("src/services/announcement-push.ts");
    expect(schema).toContain("model AnnouncementPushDispatch");
    expect(schema).toContain("cursorUserId");
    expect(fanout).toContain("const RECIPIENT_BATCH_SIZE = 100");
    expect(fanout).toContain("id: dispatch.cursorUserId ? { gt: dispatch.cursorUserId } : undefined");
    expect(fanout).not.toContain("skip:");
  });

  it("deduplicates publication, dispatch, and recipient jobs", () => {
    const schema = read("prisma/schema.prisma");
    const fanout = read("src/services/announcement-push.ts");
    expect(schema).toMatch(/announcementId\s+String\s+@unique/);
    expect(schema).toContain("@@unique([announcementId, userId])");
    expect(fanout).toContain("skipDuplicates: true");
  });

  it("enforces authoritative audiences and promotional push consent", () => {
    const fanout = read("src/services/announcement-push.ts");
    const announcements = read("src/services/announcements.ts");
    expect(fanout).toContain("audienceWhere(announcement.audience)");
    expect(fanout).toContain("promotionalPushNotifications: true");
    expect(announcements).toContain("Product announcements must be classified as promotional.");
  });

  it("rechecks account, consent, publication, cancellation, and expiry at delivery", () => {
    const worker = read("src/services/push-delivery-outbox.ts");
    expect(worker).toContain("job.announcement.status === AnnouncementStatus.PUBLISHED");
    expect(worker).toContain("job.user.status === UserStatus.ACTIVE");
    expect(worker).toContain("job.user.settings?.promotionalPushNotifications === true");
    expect(worker).toContain('"ANNOUNCEMENT_INELIGIBLE"');
  });

  it("uses existing encrypted subscriptions, outbox retries, and permanent revocation", () => {
    const worker = read("src/services/push-delivery-outbox.ts");
    expect(worker).toContain("BrowserPushSubscriptionService.decode");
    expect(worker).toContain("const MAX_ATTEMPTS = 5");
    expect(worker).toContain("status === 404 || status === 410");
    expect(worker).toContain("AnnouncementPushService.runFanout(now)");
    expect(worker).toContain('failureCode: "WORKER_LOCK_EXPIRED"');
    expect(worker).toContain("const INVOCATION_BUDGET_MS = 20_000");
    expect(worker).toContain("const SEND_TIMEOUT_MS = 5_000");
  });

  it("uses privacy-safe copy, destinations, and stable opaque tags", () => {
    const fanout = read("src/services/announcement-push.ts");
    const worker = read("public/sw.js");
    expect(fanout).toContain("announcement.message.slice(0, 1000)");
    expect(fanout).toContain('safeNotificationPath(announcement.destination) ?? "/notifications"');
    expect(fanout).toContain('mwezora:announcement:');
    expect(worker).toContain("/^mwezora:announcement:[a-f0-9]{24}$/");
  });

  it("extends the existing composer with an explicit off-by-default switch", () => {
    const composer = read("src/app/(admin)/admin/notifications/AdminNotificationsClient.tsx");
    expect(composer).toContain("Browser push notification");
    expect(composer).toContain("<Switch");
    expect(composer).toContain("Push notifications will be queued for eligible subscribed devices when this announcement is published.");
    expect(composer).toContain('pushEnabled: false');
  });
});
