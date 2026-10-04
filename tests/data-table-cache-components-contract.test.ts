import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("DataTable Cache Components safety", () => {
  it("disables TanStack timing instrumentation and keeps caller-owned row identity", () => {
    const table = source("src/components/data-table-runtime.tsx");
    const boundary = source("src/components/data-table.tsx");
    expect(table).toContain("debugAll: false");
    expect(table).toContain("debugTable: false");
    expect(table).toContain("debugRows: false");
    expect(table).toContain("debugColumns: false");
    expect(table).toContain("debugHeaders: false");
    expect(table).toContain("debugCells: false");
    expect(table).toContain("getRowId,");
    expect(table).not.toMatch(/Date\.now\(|Math\.random\(|randomUUID\(/);
    expect(boundary).toContain("ssr: false");
    expect(boundary).toContain("DataTableShell");
  });

  it("keeps the dashboard and category hierarchy on the shared table", () => {
    expect(source("src/app/(admin)/admin/page.tsx")).toContain("<DataTable");
    expect(source("src/app/(admin)/admin/categories/page.tsx")).toContain("<DataTable");
  });

  it("documents the installed TanStack memo timing guard that requires runtime isolation", () => {
    const tanstack = source("node_modules/@tanstack/table-core/build/lib/index.mjs");
    expect(tanstack).toContain("if (opts.key && opts.debug) depTime = Date.now()");
    expect(tanstack).toContain("debug: () => {");
  });
});
