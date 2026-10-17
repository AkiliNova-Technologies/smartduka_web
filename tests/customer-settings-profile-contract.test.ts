import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const settings = read("src/app/(customer)/settings/settings-content.tsx");
const provider = read("src/providers/UserDataProvider.tsx");

describe("customer profile settings", () => {
  it("keeps email read-only and exposes only supported profile fields", () => {
    expect(settings).toContain('id="email-address"');
    expect(settings).toContain('readOnly aria-readonly="true"');
    expect(settings).toContain("fullName: normalizedProfile.fullName");
    expect(settings).toContain("phoneNumber: normalizedProfile.phone || null");
    expect(settings).not.toContain("profile photo upload");
  });

  it("tracks dirty state and prevents duplicate or unchanged submissions", () => {
    expect(settings).toContain("const profileDirty =");
    expect(settings).toContain("const districtDirty =");
    expect(settings).toContain("disabled={!profileDirty || settingsSaving}");
    expect(settings).toContain("disabled={!districtDirty || settingsSaving}");
    expect(provider).toContain("Promise<boolean>");
  });

  it("persists delivery district and retains the established sign-out flow", () => {
    expect(settings).toContain("updateSettings({ deliveryDistrict: district || null })");
    expect(settings).toContain("await logout(); router.replace(\"/\")");
    expect(settings).toContain("Delivery preferences");
    expect(settings).toContain("Account actions");
  });

  it("uses responsive layouts and adaptive theme tokens", () => {
    expect(settings).toContain("sm:grid-cols-2");
    expect(settings).toContain("sm:flex-row");
    expect(settings).toContain("bg-primary/10");
    expect(settings).not.toMatch(/(?:bg|text)-(?:purple|violet|green|blue)-\d+/);
  });
});
