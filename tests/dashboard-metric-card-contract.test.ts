import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("dashboard metric cards", () => {
  it("preserves the vendor overview card as the shared visual contract", () => {
    const card = source("src/components/dashboard-metric-card.tsx");
    expect(card).toContain("rounded-xl border border-border/60 bg-card p-4");
    expect(card).toContain("size-10");
    expect(card).toContain("text-2xl font-semibold tracking-tight tabular-nums");
  });

  it("is reused by vendor and admin metric surfaces", () => {
    for (const path of ["src/app/(vendor)/vendor/page.tsx", "src/app/(vendor)/vendor/reviews/page.tsx", "src/app/(vendor)/vendor/finance/page.tsx", "src/components/admin/admin-metric-card.tsx"]) expect(source(path)).toContain("DashboardMetricCard");
  });
});
