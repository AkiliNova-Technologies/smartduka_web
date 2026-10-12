import { describe, expect, it } from "vitest";
import { DEFAULT_APPEARANCE, normalizeAppearance } from "@/lib/appearance";
import { sanitizeUserSettingsPayload, UserSettingsPayloadError } from "@/services/settings";

describe("appearance preferences", () => {
  it("accepts only the curated theme and accent identifiers", () => {
    expect(sanitizeUserSettingsPayload({ themeMode: "dark", accentColor: "coral", personality: "ELEGANT" })).toEqual({ themeMode: "dark", accentColor: "coral", personality: "ELEGANT" });
    expect(() => sanitizeUserSettingsPayload({ accentColor: "#ff00ff" })).toThrow(UserSettingsPayloadError);
    expect(() => sanitizeUserSettingsPayload({ themeMode: "sepia" })).toThrow(UserSettingsPayloadError);
    expect(() => sanitizeUserSettingsPayload({ personality: "INFERRED" })).toThrow(UserSettingsPayloadError);
  });

  it("keeps partial preference updates partial", () => {
    expect(sanitizeUserSettingsPayload({ accentColor: "rose" })).toEqual({ accentColor: "rose" });
    expect(sanitizeUserSettingsPayload({ themeMode: "system" })).toEqual({ themeMode: "system" });
  });

  it("falls back safely for malformed or legacy saved values", () => {
    expect(normalizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance({ themeMode: "solar", accentColor: "unknown" })).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance({ themeMode: "light", accentColor: "teal", personality: "PLAYFUL" })).toEqual({ themeMode: "light", accentColor: "teal", personality: "PLAYFUL" });
  });
});
