import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("admin verification workspace contract", () => {
  const detail = source("src/app/(admin)/admin/verifications/[id]/AdminVerificationDetailClient.tsx");
  const service = source("src/services/shop-verifications.ts");

  it("uses the canonical deterministic detail navigation and button composition", () => {
    expect(detail).toContain('backHref="/admin/verifications"');
    expect(detail).toContain("<Button asChild variant=\"outline\"");
    expect(detail).toContain("Open vendor details");
  });

  it("presents an explicit guarded approval and rejection workflow", () => {
    expect(detail).toContain("Verification decision");
    expect(detail).toContain("Approve verification");
    expect(detail).toContain("Reject verification");
    expect(detail).toContain("Requirements outstanding");
    expect(detail).toContain("reason.trim().length < 3");
    expect(detail).toContain("toast.success");
    expect(detail).not.toContain("window.confirm");
    expect(detail).not.toContain("window.alert");
  });

  it("retains server authorization, transitions, eligibility, audit, notifications, and moderation separation", () => {
    expect(service).toContain('requireAdminContext("platform:manage_verifications")');
    expect(service).toContain("if (!allowed[application.status]?.includes(target))");
    expect(service).toContain('target === "VERIFIED"');
    expect(service).toContain("this.eligibilityForVendor(application.vendorId)");
    expect(service).toContain("shopVerificationActivity.create");
    expect(service).toContain("auditLog.create");
    expect(service).toContain("NotificationService.create");
    expect(service).toContain("verificationStatus: target, isVerified: verified");
  });

  it("uses authenticated document actions and a page-specific responsive skeleton", () => {
    expect(detail).toContain("document.viewUrl");
    expect(detail).toContain("document.downloadUrl");
    expect(detail).toContain("aria-label={`Preview ${document.name}`}");
    const loading = source("src/app/(admin)/admin/verifications/[id]/loading.tsx");
    expect(loading).toContain("Loading verification details");
    expect(loading).toContain("lg:grid-cols-3");
    expect(loading).toContain("sm:grid-cols-2");
  });
});
