import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("admin dashboard overview", () => {
  it("uses canonical metric cards and lightweight DataTable previews", () => {
    const dashboard = source("src/app/(admin)/admin/page.tsx");
    expect(dashboard).toContain("DashboardMetricCard");
    expect(dashboard).toContain("Gross marketplace sales");
    expect(dashboard).toContain("Active shops");
    expect(dashboard).toContain("DataTable");
    expect(dashboard).toContain("previewFeatures");
    expect(dashboard).toContain("Vendors requiring attention");
    expect(dashboard).toContain("Operational attention");
    expect(dashboard).toContain("Recent customers");
  });

  it("defines sales from completed payments and public active shops", () => {
    const service = source("src/services/admin.ts");
    expect(service).toContain('paymentStatus: "COMPLETED"');
    expect(service).toContain('status: "ACTIVE", deletedAt: null');
    expect(service).toContain("activeShops");
  });
});
