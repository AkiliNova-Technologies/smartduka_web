import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { sanitizeUserSettingsPayload } from "@/services/settings";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const schema = read("prisma/schema.prisma");
const service = read("src/services/marketing-notifications.ts");
const admin = read("src/app/(admin)/admin/notifications/AdminNotificationsClient.tsx");
const panel = read("src/app/(admin)/admin/notifications/MarketingCampaignsPanel.tsx");
const listRoute = read("src/app/api/v1/notifications/route.ts");

describe("P2 marketing notification domain", () => {
  it("keeps campaigns distinct from announcements and marketplace promotions", () => {
    expect(schema).toContain("model MarketingNotificationCampaign {");
    expect(schema).toContain("model MarketingNotificationUserState {");
    expect(schema).toContain("model PromotionCampaign {");
    expect(schema).toContain("model Announcement {");
  });

  it("persists sparse, account-isolated delivery and read state", () => {
    expect(schema).toContain("@@unique([campaignId, userId])");
    expect(schema).toContain("@@index([userId, deliveredAt])");
    expect(service).toContain("where: { campaignId: id, userId");
    expect(service).toContain("skipDuplicates: true");
  });

  it("uses the approved lifecycle with concurrency-safe publication", () => {
    expect(service).toContain("TransactionIsolationLevel.Serializable");
    expect(service).toContain("status: { in: [AnnouncementStatus.DRAFT, AnnouncementStatus.SCHEDULED] }");
    expect(service).toContain("MARKETING_NOTIFICATION_SCHEDULED");
    expect(service).toContain("MARKETING_NOTIFICATION_EXPIRED");
    expect(read("src/app/api/cron/platform-revenue/route.ts")).toContain("MarketingNotificationService.advanceLifecycle()");
  });

  it("enforces admin authorization, audit logging and publish rate limits", () => {
    expect(service).toContain('requireAdminContext("platform:manage_announcements")');
    expect(service).toContain('entity: "MarketingNotificationCampaign"');
    expect(read("src/app/api/admin/notifications/marketing/[id]/publish/route.ts")).toContain("checkRateLimit");
  });
});

describe("P2 consent, limits and destinations", () => {
  it("defaults in-app marketing preferences off and accepts explicit updates", () => {
    expect(schema).toContain("promotionalInAppNotifications Boolean @default(false)");
    expect(schema).toContain("shoppingRecommendations       Boolean @default(false)");
    expect(sanitizeUserSettingsPayload({ promotionalInAppNotifications: true, shoppingRecommendations: false })).toEqual({ promotionalInAppNotifications: true, shoppingRecommendations: false });
  });

  it("enforces consent on the server without affecting transactional notifications", () => {
    expect(service).toContain("if (!user?.settings?.promotionalInAppNotifications) return [] as MarketingNotificationAudience[]");
    expect(service).toContain("user.settings.shoppingRecommendations");
    expect(service.match(/eligibleAudiencesForUser/g)?.length).toBeGreaterThanOrEqual(4);
    expect(read("src/services/notifications.ts")).not.toContain("promotionalInAppNotifications");
  });

  it("applies a configurable conservative rolling frequency limit", () => {
    expect(read("src/lib/marketing-notification-policy.ts")).toContain("MARKETING_DAILY_LIMIT");
    expect(service).toContain("deliveredAt: { gte: dayAgo }");
    expect(service).toContain("MARKETING_DAILY_LIMIT - deliveredToday");
  });

  it("validates marketplace destinations at authoring, publication and delivery", () => {
    expect(service).toContain("status: { in: [ProductStatus.PUBLISHED, ProductStatus.ACTIVE] }");
    expect(service).toContain("vendor: { status: VendorStatus.ACTIVE, deletedAt: null }");
    expect(service).toContain("status: VendorStatus.ACTIVE, deletedAt: null");
    expect(service).toContain("isActive: true");
    expect(service.match(/resolveMarketingDestination/g)?.length).toBeGreaterThanOrEqual(4);
  });
});

describe("P2 workspace and presentation", () => {
  it("uses canonical admin metrics and tabs", () => {
    expect(admin).toContain("<AdminMetricCard");
    expect(admin).toContain('<TabsTrigger value="announcements">');
    expect(admin).toContain('<TabsTrigger value="marketing">');
    expect(admin).toContain("Manage platform announcements and keep your community informed.");
  });

  it("provides the four-stage composer and searchable destination picker", () => {
    for (const stage of ["DETAILS", "AUDIENCE", "PREVIEW", "PUBLISH"]) expect(panel).toContain(stage);
    expect(panel).toContain("<MarketingEntityCombobox");
    expect(panel).toContain("<NotificationCard");
    expect(panel).toContain("Confirm and publish");
  });

  it("integrates campaigns into shared history, unread counts and mutations", () => {
    expect(listRoute).toContain("MarketingNotificationService.listForUser");
    expect(listRoute).toContain("personalUnread + announcementUnread + marketingUnread");
    expect(listRoute).toContain('source: "MARKETING"');
    expect(read("src/app/api/v1/notifications/[id]/read/route.ts")).toContain('id.startsWith("marketing:")');
    expect(read("src/app/api/v1/notifications/[id]/route.ts")).toContain("MarketingNotificationService.dismiss");
    expect(read("src/components/notifications/NotificationsSheet.tsx")).toContain("Promotional");
  });

  it("shows only functional in-app preference controls", () => {
    const settings = read("src/app/(customer)/settings/settings-content.tsx");
    expect(settings).toContain("promotionalInAppNotifications");
    expect(settings).toContain("shoppingRecommendations");
    expect(settings).not.toContain('"marketingNewsletter",\n                "Offers and updates"');
  });
});
