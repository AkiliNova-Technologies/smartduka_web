import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("dashboard page header contract", () => {
  it("provides an accessible, responsive, theme-aware back header", () => {
    const header = read("src/components/dashboard-page-header.tsx");
    expect(header).toContain("backHref: string");
    expect(header).toContain("title: ReactNode");
    expect(header).toContain("description?: ReactNode");
    expect(header).toContain("trailing?: ReactNode");
    expect(header).toContain("className?: string");
    expect(header).toContain('aria-label="Go back"');
    expect(header).toContain('href={backHref}');
    expect(header).toContain("rounded-full");
    expect(header).toContain("border-b");
    expect(header).toContain("min-w-0");
    expect(header).toContain("TooltipContent");
    expect(header).toContain("Go back");
  });

  it.each([
    ["src/app/(vendor)/vendor/products/new/page.tsx", '/vendor/products'],
    ["src/app/(vendor)/vendor/products/[id]/edit/page.tsx", '/vendor/products'],
    ["src/app/(vendor)/vendor/products/[id]/page.tsx", '/vendor/products'],
    ["src/app/(vendor)/vendor/settings/verification/page.tsx", '/vendor/settings'],
    ["src/app/(admin)/admin/payments/[id]/page.tsx", '/admin/payments'],
    ["src/app/(admin)/admin/reports/[id]/AdminReportDetailClient.tsx", '/admin/reports'],
    ["src/app/(admin)/admin/verifications/[id]/AdminVerificationDetailClient.tsx", '/admin/verifications'],
  ])("uses the shared header and explicit parent destination in %s", (file, parent) => {
    const page = read(file);
    expect(page).toContain("DashboardPageHeader");
    expect(page).toContain(`backHref="${parent}"`);
    expect(page).not.toContain("router.back()");
  });
});
