import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("UI-10B action-first dashboard surfaces", () => {
  it("does not expose mock operational modules in workspace navigation", () => {
    expect(source("src/components/layout/AdminSidebar.tsx")).not.toContain('href: "/admin/complaints"');
    expect(source("src/components/layout/VendorSidebar.tsx")).not.toContain('href: "/vendor/reports"');
  });

  it("keeps the Admin dashboard focused on real vendor-review attention", () => {
    const dashboard = source("src/app/(admin)/admin/page.tsx");
    expect(dashboard).toContain("Pending vendor reviews");
    expect(dashboard).toContain('href="/admin/vendors"');
    expect(dashboard).not.toContain("Total Categories");
    expect(dashboard).not.toContain("Total Products");
    expect(dashboard).not.toContain("Total Vendors");
  });

  it("does not present order-derived finance claims in the Vendor dashboard", () => {
    const dashboard = source("src/app/(vendor)/vendor/page.tsx");
    for (const claim of ["Gross Revenue", "Escrow Balance", "trade margins", "protection locks", "unlocked"]) {
      expect(dashboard).not.toContain(claim);
    }
    expect(dashboard).toContain("Orders requiring action");
    expect(dashboard).toContain("Out-of-stock products");
  });
});
