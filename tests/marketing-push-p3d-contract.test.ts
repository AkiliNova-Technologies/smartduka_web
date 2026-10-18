import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("P3D consent-based marketing push", () => {
  it("defaults campaigns and customer consent to off", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/promotionalPushNotifications\s+Boolean\s+@default\(false\)/);
    expect(schema).toMatch(/pushEnabled\s+Boolean\s+@default\(false\)/);
    expect(read("prisma/migrations/20261018150000_marketing_push_dispatch/migration.sql")).toContain('"pushEnabled" BOOLEAN NOT NULL DEFAULT false');
  });

  it("creates durable intent only when an enabled campaign becomes published", () => {
    const service = read("src/services/marketing-notifications.ts");
    expect(service).toContain("if (!scheduled && current.pushEnabled) await tx.marketingPushDispatch.upsert");
    expect(service).toContain("marketingPushDispatch.createMany");
    expect(service).toContain("pushCampaigns = due.filter((row) => row.pushEnabled)");
  });

  it("uses bounded keyset fan-out with stale-lock recovery", () => {
    const service = read("src/services/marketing-push.ts");
    expect(service).toContain("const RECIPIENT_BATCH_SIZE = 100");
    expect(service).toContain("id: dispatch.cursorUserId ? { gt: dispatch.cursorUserId } : undefined");
    expect(service).toContain("lockedAt: { lt: staleBefore }");
    expect(service).not.toContain("skip:");
  });

  it("reserves frequency once per campaign and queues each current device idempotently", () => {
    const schema = read("prisma/schema.prisma");
    const service = read("src/services/marketing-push.ts");
    expect(schema).toContain("@@unique([campaignId, userId])");
    expect(schema).toContain("@@unique([marketingCampaignId, targetSubscriptionId])");
    expect(service).toContain("delivered >= MARKETING_DAILY_LIMIT");
    expect(service).toContain("skipDuplicates: true");
    expect(service).toContain("subscription.registrationVersion");
  });

  it("fails closed on consent, account, audience, destination, and subscription changes", () => {
    const worker = read("src/services/push-delivery-outbox.ts");
    expect(worker).toContain("marketingConsentEligible(job.user.settings, campaign.audience, true)");
    expect(worker).toContain("marketingSettingsWhere(job.marketingCampaign!.audience, true)");
    const eligibility = read("src/lib/marketing-campaign-eligibility.ts");
    expect(eligibility).toContain("promotionalInAppNotifications");
    expect(eligibility).toContain("promotionalPushNotifications");
    expect(eligibility).toContain("shoppingRecommendations");
    expect(worker).toContain("resolveMarketingDestination");
    expect(worker).toContain("registrationVersion: subscription.registrationVersion");
    expect(worker).toContain('"MARKETING_CAMPAIGN_INELIGIBLE"');
  });

  it("stops pending jobs on campaign cancellation, expiry, and consent revocation", () => {
    const marketing = read("src/services/marketing-notifications.ts");
    const settings = read("src/services/settings.ts");
    expect(marketing).toContain('failureCode: "MARKETING_CAMPAIGN_CANCELLED"');
    expect(marketing).toContain('failureCode: "MARKETING_CAMPAIGN_EXPIRED"');
    expect(settings).toContain('failureCode: "MARKETING_CONSENT_REVOKED"');
  });

  it("extends the existing settings and composer without auto-requesting permission", () => {
    const settings = read("src/app/(customer)/settings/settings-content.tsx");
    const composer = read("src/app/(admin)/admin/notifications/MarketingCampaignsPanel.tsx");
    const hook = read("src/hooks/use-push-notification-settings.ts");
    expect(settings).toContain("Promotional push notifications");
    expect(settings).toContain("Receive optional browser notifications about offers, products, and shops you may like.");
    expect(composer).toContain("Browser push notification");
    expect(composer).toContain("<Switch");
    expect(hook).not.toMatch(/useEffect[\s\S]{0,300}Notification\.requestPermission/);
  });

  it("allows only same-origin navigation with an opaque marketing tag", () => {
    const worker = read("public/sw.js");
    expect(worker).toContain("safeInternalPath");
    expect(worker).toContain("/^mwezora:marketing:[a-f0-9]{24}$/");
    expect(worker).toContain("client.navigate(target)");
  });
});
