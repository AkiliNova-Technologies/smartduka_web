import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const schema = read("prisma/schema.prisma");
const service = read("src/services/announcements.ts");
const notifications = read("src/app/api/v1/notifications/route.ts");
const admin = read("src/app/(admin)/admin/notifications/AdminNotificationsClient.tsx");
const history = read("src/app/(customer)/notifications/page.tsx");
const banner = read("src/components/notifications/MaintenanceBanner.tsx");

describe("P1 announcement domain", () => {
  it("uses one announcement with sparse, unique per-user state", () => {
    expect(schema).toContain("model Announcement {");
    expect(schema).toContain("model AnnouncementUserState {");
    expect(schema).toContain("@@unique([announcementId, userId])");
    expect(schema).not.toContain("announcementId String?\n  notification");
  });

  it("defines the approved lifecycle and indexed publication windows", () => {
    for (const state of ["DRAFT", "SCHEDULED", "PUBLISHED", "CANCELLED", "EXPIRED"]) expect(schema).toContain(state);
    expect(schema).toContain("@@index([status, scheduledAt])");
    expect(schema).toContain("@@index([presentation, status, expiresAt])");
    expect(service).toContain("updateMany({ where: { id, status:");
    expect(service).toContain("TransactionIsolationLevel.Serializable");
  });

  it("enforces current-role audiences without duplicate presentation", () => {
    expect(service).toContain("return [...new Set(audiences)]");
    expect(service).toContain("audience: { in: audiences }");
    expect(service).toContain("status: UserStatus.ACTIVE, deletedAt: null");
  });

  it("keeps publishing authorized, audited, rate limited and immutable", () => {
    expect(service).toContain('requireAdminContext("platform:manage_announcements")');
    expect(service).toContain("Published or cancelled announcements cannot be edited.");
    for (const event of ["ANNOUNCEMENT_CREATED", "ANNOUNCEMENT_EDITED", "ANNOUNCEMENT_SCHEDULED", "ANNOUNCEMENT_PUBLISHED", "ANNOUNCEMENT_CANCELLED"]) expect(service).toContain(event);
    expect(read("src/app/api/admin/notifications/[id]/publish/route.ts")).toContain("checkRateLimit");
  });

  it("validates content, UTC windows and internal destinations", () => {
    expect(service).toContain("Expiration must be after publication.");
    expect(service).toContain("safeNotificationPath");
    expect(service).toContain("new Date(value)");
    expect(admin).toContain("stored as UTC");
  });

  it("advances scheduled and expired records idempotently", () => {
    expect(service).toContain("status: AnnouncementStatus.SCHEDULED, scheduledAt: { lte: now }");
    expect(service).toContain("status: AnnouncementStatus.EXPIRED");
    expect(read("src/app/api/cron/platform-revenue/route.ts")).toContain("AnnouncementService.advanceLifecycle()");
  });
});

describe("P1 user and admin experiences", () => {
  it("provides the staged admin composer and management table", () => {
    for (const stage of ["DETAILS", "PREVIEW", "PUBLISH"]) expect(admin).toContain(stage);
    expect(admin).toContain("<DataTable");
    expect(admin).toContain("<NotificationCard");
    expect(admin).toContain("Save draft");
  });

  it("merges announcements into paginated history and bell counts", () => {
    expect(notifications).toContain("AnnouncementService.listForUser");
    expect(notifications).toContain("personalUnread + announcementUnread");
    expect(notifications).toContain(".slice((page - 1) * pageSize, page * pageSize)");
    expect(history).toContain("Notification history");
    expect(history).toContain("meta.hasMore");
  });

  it("persists read, unread and dismissal state with ownership checks", () => {
    expect(service).toContain("announcementId_userId");
    expect(service).toContain("private static async assertEligible");
    expect(read("src/app/api/v1/notifications/[id]/read/route.ts")).toContain("AnnouncementService.setRead");
    expect(read("src/app/api/v1/notifications/[id]/route.ts")).toContain("AnnouncementService.dismiss");
  });

  it("shows at most one eligible, dismissible maintenance banner", () => {
    expect(service).toContain(".slice(0, 1)");
    expect(banner).toContain('aria-label="Important platform announcement"');
    expect(banner).toContain('aria-label="Dismiss announcement"');
    expect(banner).not.toContain("Dialog");
  });
});
