import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("cookie consent", () => {
  const consent = source("src/components/legal/cookie-consent.tsx");

  it("uses a versioned first-party cookie and keeps optional tracking disabled", () => {
    expect(consent).toContain('COOKIE_CONSENT_COOKIE = "smartduka_cookie_consent"');
    expect(consent).toContain("COOKIE_CONSENT_VERSION = 1");
    expect(consent).toContain("SameSite=Lax");
    expect(consent).toContain("no optional analytics or marketing tracking enabled");
  });

  it("provides the consent actions and an essential-only preferences panel", () => {
    expect(consent).toContain("Reject Optional");
    expect(consent).toContain("Accept All");
    expect(consent).toContain("Save preferences");
    expect(consent).toContain("Essential cookies");
    expect(consent).toContain("Always on");
  });

  it("isolates the request cookie behind a consent runtime boundary and exposes footer settings", () => {
    const layout = source("src/app/(customer)/layout.tsx");
    const runtime = source("src/components/legal/CookieConsentRuntime.tsx");
    const footer = source("src/components/layout/MarketplaceFooter.tsx");

    expect(layout).not.toContain("cookies()");
    expect(layout).toContain("<CookieConsentRuntime />");
    expect(runtime).toContain("await cookies()");
    expect(runtime).toContain("initialConsentValue={consent}");
    expect(footer).toContain("<CookieSettingsButton />");
  });

  it("publishes the policy routes and links them from consent and authentication", () => {
    expect(source("src/app/(customer)/cookie-policy/page.tsx")).toContain("smartduka_cookie_consent");
    expect(source("src/app/(customer)/privacy-policy/page.tsx")).toContain("Privacy requests");
    expect(consent).toContain('href="/cookie-policy"');
    expect(source("src/app/login/page.tsx")).toContain('href="/privacy-policy"');
  });
});
