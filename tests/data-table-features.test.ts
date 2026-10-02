import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

describe("DataTable feature configuration", () => {
  const table = source("src/components/data-table.tsx");
  const variants = source("src/components/vendor/ProductVariantEditor.tsx");

  it("keeps the established defaults while making optional features configurable", () => {
    expect(table).toContain("export interface DataTableFeatures");
    expect(table).toContain("pagination: features?.pagination ?? true");
    expect(table).toContain("search: features?.search ?? false");
    expect(table).toContain("columnVisibility: features?.columnVisibility ?? true");
    expect(table).toContain("rowSelection: features?.rowSelection ?? true");
  });

  it("supports compact tables and composable toolbar, footer, and empty states", () => {
    expect(table).toContain("getPaginationRowModel: enabled.pagination");
    expect(table).toContain("{enabled.search && (");
    expect(table).toContain("{enabled.columnVisibility && (");
    expect(table).toContain("toolbarContent");
    expect(table).toContain("footerContent");
    expect(table).toContain("emptyStateContent");
  });

  it("uses caller-provided row IDs and keeps variant editing in the shared table", () => {
    expect(table).toContain("getRowId,");
    expect(table).toContain("min-w-0");
    expect(variants).toContain('import { DataTable } from "@/components/data-table"');
    expect(variants).toContain("pagination: false");
    expect(variants).toContain("columnVisibility: false");
    expect(variants).toContain("rowSelection: true");
  });
});
