import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  resolve(process.cwd(), "src/app/(admin)/admin/payments/page.tsx"),
  "utf8",
);

describe("admin payment table search", () => {
  it("uses the shared controlled search and resets server pagination", () => {
    expect(page).toContain('placeholder: "Search payments..."');
    expect(page).toContain('ariaLabel: "Search payments"');
    expect(page).toContain("setSubmittedSearch(value);");
    expect(page).toContain("setPage(1);");
    expect(page).toContain('params.set("search", submittedSearch.trim())');
  });

  it("keeps filters and server pagination outside the table search UI", () => {
    expect(page).toContain("const [filter, setFilter]");
    expect(page).toContain("<PaginationControls");
    expect(page).not.toContain("renderTabs=");
    expect(page).not.toContain("Search payment, order, shop, or reference");
  });
});
