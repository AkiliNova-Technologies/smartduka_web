import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("UI-11B.7B featured ranking UI", () => {
  const products = source("src/components/marketing/featured-products-manager.tsx");
  const shops = source("src/components/marketing/featured-shops-manager.tsx");
  const ranking = source("src/components/marketing/featured-ranking-list.tsx");

  it("uses the shared card-based table and dialog merchandising", () => {
    expect(products).not.toContain("priority");
    expect(shops).not.toContain("priority");
    expect(ranking).toContain("DataTable");
    expect(ranking).toContain("DataTableRowActions");
    expect(ranking).toContain("Add featured");
    expect(ranking).toContain("MarketingEntityCombobox");
  });

  it("delegates accessible drag sorting to the standardized DataTable", () => {
    const table = source("src/components/data-table-runtime.tsx");
    expect(ranking).toContain("onReorder");
    expect(table).toContain("DndContext");
    expect(table).toContain("SortableContext");
    expect(table).toContain("useSortable");
    expect(table).toContain("KeyboardSensor");
    expect(table).toContain("Drag to reorder");
  });

  it("sends ordered IDs, reconciles canonical rows, and rolls back conflicts", () => {
    expect(ranking).toContain("nextRows.map((row) => row.id)");
    expect(ranking).toContain("setOptimisticRows(await onReorder");
    expect(ranking).toContain("The featured list changed. Refresh and try again.");
    expect(ranking).toContain("await onRefresh()");
  });
});
