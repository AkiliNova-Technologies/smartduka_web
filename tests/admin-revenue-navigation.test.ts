import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const source = readFileSync(resolve(process.cwd(), "src/components/layout/AdminSidebar.tsx"), "utf8");
const shell = readFileSync(resolve(process.cwd(), "src/components/layout/DashboardSidebar.tsx"), "utf8");
describe("admin platform revenue navigation", () => {
  it("adds Platform Revenue beside marketplace payment operations", () => { expect(source).toContain('label: "Platform Revenue", href: "/admin/revenue"'); expect(source).toContain('label: "Payment operations", href: "/admin/payments"'); });
  it("limits finance navigation to billing-authorized roles", () => { expect(source).toContain('"SUPER_ADMIN", "ADMIN", "BILLING"'); expect(source).toContain("canManageBilling"); });
  it("uses the shared pathname matcher so payment destinations activate independently", () => { expect(shell).toContain("pathname === href || pathname.startsWith(`${href}/`)"); });
});
