import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("seller onboarding, moderation, and verification UX", () => {
  it("redirects completed onboarding to the marketplace and labels step two as Business Location", () => {
    const form = read("src/components/vendor/kyc-form.tsx");
    expect(form).toContain('router.push("/")');
    expect(form).toContain('label: "Business Location"');
    expect(form).toContain('>Business Location</h2>');
    expect(form).not.toContain('label: "Contact"');
  });

  it("uses the custom moderation dialog instead of native browser prompts", () => {
    const page = read("src/app/(admin)/admin/vendors/page.tsx");
    const dialog = read("src/components/admin/shop-moderation-dialog.tsx");
    expect(page).toContain("ShopModerationDialog");
    expect(page).not.toMatch(/window\.(prompt|confirm)|alert\(/);
    expect(dialog).toContain('reasonRequired');
    expect(dialog).toContain('moderateShopAction(shop.id, action, enteredReason || undefined)');
    expect(dialog).toContain('reason.trim().length < 3');
  });

  it("makes verification discoverable and presents authoritative dashboard states", () => {
    const sidebar = read("src/components/layout/VendorSidebar.tsx");
    const dashboard = read("src/app/(vendor)/vendor/page.tsx");
    const verification = read("src/app/(vendor)/vendor/settings/verification/page.tsx");
    expect(sidebar).toContain('{ label: "Verification", href: "/vendor/settings/verification"');
    for (const copy of ["Get your shop verified", "Apply for verification", "Verification under review", "Verified Shop", "Verification needs attention", "Continue verification"]) {
      expect(`${dashboard}\n${verification}`).toContain(copy);
    }
    expect(dashboard).toContain("profile.verificationStatus");
    expect(verification).toContain("app?.rejectionReason");
  });
});
