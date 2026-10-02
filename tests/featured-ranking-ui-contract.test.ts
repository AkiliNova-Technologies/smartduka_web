import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("UI-11B.7B featured ranking UI", () => {
  const products = source("src/components/marketing/featured-products-manager.tsx");
  const shops = source("src/components/marketing/featured-shops-manager.tsx");
  const ranking = source("src/components/marketing/featured-ranking-list.tsx");

  it("replaces raw priority controls with ranked, dialog-based merchandising", () => {
    expect(products).not.toContain("priority");
    expect(shops).not.toContain("priority");
    expect(ranking).toContain("Ranked {kind}s");
    expect(ranking).toContain("Add featured");
    expect(ranking).toContain("MarketingEntityCombobox");
  });

  it("uses the existing dnd-kit stack with handle-only keyboard sorting", () => {
    expect(ranking).toContain("DndContext");
    expect(ranking).toContain("SortableContext");
    expect(ranking).toContain("useSortable");
    expect(ranking).toContain("sortableKeyboardCoordinates");
    expect(ranking).toContain("setActivatorNodeRef");
    expect(ranking).toContain("Reorder ${label}");
  });

  it("sends ordered IDs, reconciles canonical rows, and rolls back conflicts", () => {
    expect(ranking).toContain("nextOrder.map((row) => row.id)");
    expect(ranking).toContain("setOptimisticRows(canonical");
    expect(ranking).toContain("The featured list changed. Refresh and try again.");
    expect(ranking).toContain("await onRefresh()");
  });
});
