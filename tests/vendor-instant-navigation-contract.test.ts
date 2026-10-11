import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(join(process.cwd(), file), "utf8");

describe("vendor instant-navigation architecture", () => {
  it("keeps framework validation enabled", () => {
    const config = read("next.config.ts");
    expect(config).toContain("cacheComponents: true");
    expect(config).toContain("partialPrefetching: true");
    expect(config).not.toContain("manual-warning");
  });

  it("validates vendor membership inside a request-time Suspense boundary", () => {
    const layout = read("src/app/(vendor)/vendor/layout.tsx");
    expect(layout).toContain(
      "<Suspense fallback={<VendorDashboardShellFallback />}>",
    );
    expect(layout).toContain("await connection()");
    expect(layout).toContain("requireVendorContext(undefined");
    expect(layout).toContain("allowInactiveShop: true");
  });

  it("always exposes the selected page segment from the shared client shell", () => {
    const shell = read(
      "src/app/(vendor)/vendor/vendor-dashboard-shell.tsx",
    );
    expect(shell).toContain("<Suspense fallback={<VendorPageFallback />}>");
    expect(shell).toContain("{children}");
    expect(shell).not.toContain("profileReady ?");
  });

  it("does not hide vendor routes behind broad instant opt-outs", () => {
    const vendorFiles = [
      "src/app/(vendor)/vendor/products/page.tsx",
      "src/app/(vendor)/vendor/reviews/layout.tsx",
      "src/app/(vendor)/vendor/settings/page.tsx",
      "src/app/(vendor)/vendor/settings/payouts/layout.tsx",
    ];

    for (const file of vendorFiles) {
      expect(read(file)).not.toContain("instant = false");
    }
  });

  it("keeps request-bound server pages behind page-owned fallbacks", () => {
    for (const file of [
      "src/app/(vendor)/vendor/orders/page.tsx",
      "src/app/(vendor)/vendor/transactions/page.tsx",
    ]) {
      const page = read(file);
      expect(page).toContain("<Suspense fallback={");
      expect(page.indexOf("<Suspense fallback={")).toBeLessThan(
        page.indexOf("await connection()"),
      );
    }
  });

  it("opts out only the redirect-only legacy verification alias", () => {
    const alias = read("src/app/(vendor)/vendor/verification/page.tsx");
    expect(alias).toContain("export const instant = false");
    expect(alias).toContain('redirect("/vendor/settings/verification")');
  });
});
