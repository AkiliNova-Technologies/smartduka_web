import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("dashboard sidebar contract", () => {
  const shared = source("src/components/layout/DashboardSidebar.tsx");
  const vendor = source("src/components/layout/VendorSidebar.tsx");
  const admin = source("src/components/layout/AdminSidebar.tsx");

  it("uses a single shell with active nested-route and mobile-close behavior", () => {
    expect(shared).toContain("isActiveDashboardRoute");
    expect(shared).toContain("pathname.startsWith(`${href}/`)");
    expect(shared).toContain("setOpenMobile(false)");
    expect(shared).toContain('collapsible="icon"');
  });

  it("keeps the existing role-specific destinations in shared navigation groups", () => {
    expect(vendor).toContain('href: "/vendor/products"');
    expect(vendor).toContain('href: "/vendor/settings"');
    expect(admin).toContain('href: "/admin/vendors"');
    expect(admin).toContain('href: "/admin/marketing/promotions"');
  });

  it("keeps theme controls in the header rather than either sidebar", () => {
    expect(vendor).not.toContain("useTheme");
    expect(admin).not.toContain("useTheme");
    expect(source("src/components/layout/DashboardHeader.tsx")).toContain("ThemeButton");
  });
});
