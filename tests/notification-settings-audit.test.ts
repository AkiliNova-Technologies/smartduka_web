import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const settings = read("src/app/(customer)/settings/settings-content.tsx");
const push = read("src/components/settings/PushNotificationSettings.tsx");
const service = read("src/services/settings.ts");
const marketing = read("src/services/marketing-notifications.ts");

describe("customer notification settings audit", () => {
  it("shows only preferences that are persisted and enforced", () => {
    expect(settings).toContain("promotionalInAppNotifications");
    expect(settings).toContain("shoppingRecommendations");
    expect(settings).not.toContain('"orderAlertsEmail",');
    expect(settings).not.toContain('"securityAlertsSMS",');
    expect(settings).toContain("promotionalPushNotifications");
    expect(service).toContain('"promotionalInAppNotifications", "shoppingRecommendations"');
    expect(marketing).toContain("eligibleMarketingAudiences(user?.settings)");
    expect(read("src/lib/marketing-campaign-eligibility.ts")).toContain("settings.shoppingRecommendations");
    expect(service).toContain("MARKETING_CONSENT_REVOKED");
  });

  it("uses accessible switches, keeps essential updates informational, and places device controls below preferences", () => {
    expect(settings).toContain("<Switch");
    expect(settings).toContain("Always on");
    expect(settings.indexOf("Notification preferences")).toBeLessThan(settings.indexOf("<PushNotificationSettings"));
    expect(push).toContain("Device notifications");
    expect(push).toContain("Installation required");
    expect(push).toContain("Blocked");
  });
});
