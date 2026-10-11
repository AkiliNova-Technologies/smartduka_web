import { describe, expect, it } from "vitest";
import { COOKIE_CONSENT_MAX_AGE_MS, COOKIE_CONSENT_VERSION, parseCookieConsent, readCookieConsent } from "@/components/legal/cookie-consent";

describe("cookie consent persistence", () => {
  const saved = { version: COOKIE_CONSENT_VERSION, essential: true, analytics: true, marketing: false, preferences: true, updatedAt: "2026-10-05T00:00:00.000Z" };

  it("restores a URL-encoded first-party cookie after refresh", () => {
    expect(parseCookieConsent(encodeURIComponent(JSON.stringify(saved)))).toEqual(saved);
  });

  it("keeps rejection decisions valid and safely rejects corrupt or obsolete values", () => {
    expect(parseCookieConsent(encodeURIComponent(JSON.stringify({ ...saved, analytics: false, marketing: false, preferences: false })))).toMatchObject({ essential: true, analytics: false, marketing: false, preferences: false });
    expect(parseCookieConsent("%")).toBeNull();
    expect(parseCookieConsent(JSON.stringify({ ...saved, version: COOKIE_CONSENT_VERSION + 1 }))).toBeNull();
  });

  it("restores the retained SmartDuka cookie key during the Mwezora transition", () => {
    expect(readCookieConsent(`session=abc; smartduka_cookie_consent=${encodeURIComponent(JSON.stringify(saved))}; sidebar_state=true`)).toEqual(saved);
  });

  it("requires renewed consent after policy expiry and rejects invalid timestamps", () => {
    const savedAt = Date.parse(saved.updatedAt);
    expect(parseCookieConsent(JSON.stringify(saved), savedAt + COOKIE_CONSENT_MAX_AGE_MS)).toEqual(saved);
    expect(parseCookieConsent(JSON.stringify(saved), savedAt + COOKIE_CONSENT_MAX_AGE_MS + 1)).toBeNull();
    expect(parseCookieConsent(JSON.stringify({ ...saved, updatedAt: "not-a-date" }))).toBeNull();
  });
});
