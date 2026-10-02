import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(join(process.cwd(), "src/components/layout", file), "utf8");

describe("dashboard header contract", () => {
  it("shares the customer-style dashboard shell between vendor and admin", () => {
    expect(source("VendorHeader.tsx")).toContain("DashboardHeader");
    expect(source("AdminHeader.tsx")).toContain("DashboardHeader");
    expect(source("DashboardHeader.tsx")).toContain("min-h-16");
    expect(source("VendorSidebar.tsx")).toContain("DashboardSidebar");
    expect(source("AdminSidebar.tsx")).toContain("DashboardSidebar");
  });

  it("uses one accessible Menu toggle backed by the existing sidebar state", () => {
    const header = source("DashboardHeader.tsx");
    expect(header).toContain("<Menu className=\"size-5\"");
    expect(header).toContain("toggleSidebar");
    expect(header).toContain("aria-expanded={open}");
  });

  it("isolates vendor pathname-aware header and sidebar beneath narrow boundaries", () => {
    const layout = readFileSync(join(process.cwd(), "src/app/(vendor)/vendor/layout.tsx"), "utf8");
    expect(layout).toContain("<Suspense fallback={<VendorSidebarFallback />}>");
    expect(layout).toContain("<Suspense fallback={<VendorHeaderFallback />}>");
  });

  it("keeps role-specific account navigation and shared notification/theme controls", () => {
    const shell = source("DashboardHeader.tsx");
    expect(shell).toContain("NotificationsSheet");
    expect(shell).toContain("ThemeButton");
    expect(source("VendorHeader.tsx")).toContain('href: "/vendor/settings"');
    expect(source("AdminHeader.tsx")).toContain('href: "/admin"');
  });

  it("defers unstable notification clock reads until after mount", () => {
    const notifications = readFileSync(join(process.cwd(), "src/components/notifications/NotificationsSheet.tsx"), "utf8");
    expect(notifications).toContain("const [now, setNow] = React.useState<number | null>(null)");
    expect(notifications).toContain("window.setTimeout(() => setNow(Date.now()), 0)");
    expect(notifications).toContain("groupNotificationsByDate(notifications, now)");
  });
});
