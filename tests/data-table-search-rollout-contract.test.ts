import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("DataTable search rollout", () => {
  it.each([
    ["src/app/(admin)/admin/orders/page.tsx", "Search orders..."],
    ["src/app/(admin)/admin/products/page.tsx", "Search products..."],
    ["src/app/(admin)/admin/vendors/page.tsx", "Search vendors..."],
    ["src/app/(admin)/admin/users/page.tsx", "Search users..."],
    ["src/app/(admin)/admin/reports/page.tsx", "Search reports..."],
    ["src/app/(admin)/admin/verifications/page.tsx", "Search verifications..."],
    ["src/app/(vendor)/vendor/products/VendorProductsClient.tsx", "Search products..."],
  ])("uses shared search on %s", (file, placeholder) => {
    const page = source(file);
    expect(page).toContain("features={{ search: true }}");
    expect(page).toContain(placeholder);
    expect(page).toContain("getSearchText=");
  });

  it("keeps payment search controlled and server-backed", () => {
    const payments = source("src/app/(admin)/admin/payments/page.tsx");
    expect(payments).toContain("onValueChange:");
    expect(payments).toContain('params.set("search", submittedSearch.trim())');
  });
});
