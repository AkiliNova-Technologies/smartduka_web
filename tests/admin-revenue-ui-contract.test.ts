import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/(admin)/admin/revenue/page.tsx"), "utf8");

describe("admin platform revenue UI", () => {
  it("uses the shared server-side table and pagination controls", () => {
    expect(source).toContain('fetch(`/api/admin/revenue?${q}`');
    expect(source).toContain("<DataTable");
    expect(source).toContain("<PaginationControls");
    expect(source).toContain("<Sheet");
  });

  it("composes and resets server-side filters", () => {
    for (const field of ["filter: status", "type,", "page: String(page)", "pageSize: String(pageSize)"]) expect(source).toContain(field);
    expect(source).toContain("setPage(1)");
    expect(source).toContain("setStatus");
    expect(source).toContain("setType");
  });

  it("keeps cash, credit, and sensitive payment data separate", () => {
    for (const text of ["Service value", "Promotional credit applied", "Cash collected", "Masked provider reference", "Payment reversed"]) expect(source).toContain(text);
    expect(source).not.toContain("OAuth tokens");
    expect(source).not.toContain("merchant secrets");
  });
});
