import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { WOMENS_TAXONOMY, flattenTaxonomy } from "@/data/womens-taxonomy";

describe("women taxonomy import inputs", () => {
  it("keeps the complete canonical taxonomy within three levels", () => {
    const entries = flattenTaxonomy();
    expect(entries).toHaveLength(190);
    expect(new Set(entries.map((entry) => entry.key)).size).toBe(entries.length);
    expect(new Set(entries.map((entry) => entry.slug)).size).toBe(entries.length);

    const visit = (nodes: typeof WOMENS_TAXONOMY, depth = 1): void => {
      for (const node of nodes) {
        expect(depth).toBeLessThanOrEqual(3);
        visit(node.children ?? [], depth + 1);
      }
    };
    visit(WOMENS_TAXONOMY);
  });

  it("uses explicit, non-conflicting IDs for the reviewed legacy mappings", async () => {
    const mapping = JSON.parse(await readFile("taxonomy/women-legacy-mappings.json", "utf8")) as { mappings: Record<string, string>; approvedReparents: Record<string, { id: string; fromParentId: string; toParentKey: string }> };
    const keys = new Set(flattenTaxonomy().map((entry) => entry.key));
    expect(Object.keys(mapping.mappings).sort()).toEqual([
      "women.bags-and-accessories.fashion-accessories.hats-and-caps",
      "women.fashion.clothing.dresses",
      "women.fashion.clothing.skirts",
      "women.jewellery-and-watches.watches",
    ]);
    expect(Object.keys(mapping.mappings).every((key) => keys.has(key))).toBe(true);
    expect(new Set(Object.values(mapping.mappings)).size).toBe(Object.keys(mapping.mappings).length);
    expect(Object.entries(mapping.approvedReparents).map(([key, approval]) => [key, approval.id]).sort()).toEqual(Object.entries(mapping.mappings).sort());
    expect(Object.values(mapping.approvedReparents).every((approval) => approval.fromParentId === "4b8cd879-5877-4230-b2c8-8e964cf90e80" && keys.has(approval.toParentKey))).toBe(true);
  });
});
