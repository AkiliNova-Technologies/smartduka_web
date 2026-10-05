import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "src/app/(vendor)/vendor/finance/page.tsx"), "utf8");
const hook = readFileSync(resolve(process.cwd(), "src/hooks/use-vendor-finance.ts"), "utf8");
const client = readFileSync(resolve(process.cwd(), "src/lib/vendor-finance-client.ts"), "utf8");

describe("vendor finance withdrawals table", () => {
  it("uses the shared DataTable for masked withdrawal history", () => {
    expect(page).toContain("<DataTable");
    expect(page).toContain('header: "Payout method"');
    expect(page).toContain("maskedDestination");
    expect(page).toContain("No withdrawals yet. Withdrawal requests will appear here once created.");
  });

  it("uses platform status badges and only local pagination", () => {
    expect(page).toContain("operationBadgeClass");
    expect(page).toContain("humanizeOperation");
    expect(page).toContain("pagination: true");
    expect(page).toContain("sorting: false");
    expect(page).toContain("filtering: false");
    expect(page).toContain("search: false");
  });

  it("keeps endpoint transport in the finance client and payout setup linked to Store Settings", () => {
    expect(page).not.toContain("/api/vendor/finance");
    expect(page).not.toContain("/api/vendor/withdrawals");
    expect(page).toContain('href="/vendor/settings?tab=payouts"');
    expect(hook).toContain("vendorFinanceClient.getSummary()");
    expect(client).toContain('"/api/vendor/finance/summary"');
    expect(client).toContain('"/api/vendor/withdrawals"');
  });
});
