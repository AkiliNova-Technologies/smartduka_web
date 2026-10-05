import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const file = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const settings = file("src/app/(vendor)/vendor/settings/VendorSettingsClient.tsx");
const tab = file("src/components/vendor/settings/payout-settings-tab.tsx");
const service = file("src/lib/vendor-payouts-client.ts");
const legacyRoute = file("src/app/(vendor)/vendor/settings/payouts/page.tsx");

describe("vendor payout settings navigation", () => {
  it("composes payouts as a deep-linkable Store Settings tab", () => {
    expect(settings).toContain('id: "payouts"');
    expect(settings).toContain("<PayoutSettingsTab />");
    expect(settings).toContain('"/vendor/settings?tab=payouts"');
  });

  it("keeps endpoint transport out of page and presentation components", () => {
    expect(tab).not.toContain("/api/vendor/payouts");
    expect(tab).not.toContain("fetch(");
    expect(service).toContain('"/api/vendor/payouts"');
  });

  it("redirects the retired standalone route to the payout tab", () => {
    expect(legacyRoute).toContain('redirect("/vendor/settings?tab=payouts")');
  });
});
