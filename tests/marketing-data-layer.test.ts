import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
describe("UI-11B.2 marketing data layer", () => {
  it("centralizes public endpoint paths and uses abort-safe customer hooks", () => {
    expect(source("src/lib/marketing-client.ts")).toContain("/api/marketing/");
    expect(source("src/hooks/use-marketing.ts")).toContain("AbortController");
  });
  it("keeps customer pages free of raw marketing endpoints and server service imports", () => {
    for (const file of ["src/app/(customer)/page.tsx", "src/app/(customer)/products/page.tsx", "src/app/(customer)/shops/page.tsx"]) {
      const page = source(file);
      expect(page).not.toContain("/api/marketing/");
      expect(page).not.toContain("MarketingService");
    }
  });
  it("keeps the admin marketing UI behind the centralized hook", () => {
    const adminPage = source("src/components/marketing/promotions-manager.tsx");
    expect(adminPage).toContain("useAdminMarketing");
    expect(adminPage).not.toContain("/api/admin/marketing/");
    expect(adminPage).not.toContain("fetch(");
  });
  it("keeps marketing eligibility and CTA resolution on the server", () => {
    const service = source("src/services/marketing.ts");
    expect(service).toContain("new Date()");
    expect(service).toContain("resolveCta");
    expect(service).toContain("placements: { has: placement }");
    expect(service).not.toContain("?.findMany");
  });
});
