import { describe, expect, it } from "vitest";
import { definitionsForCategory } from "@/components/vendor/ProductSpecificationsEditor";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("product specifications", () => {
  it("does not guess category-specific specification fields", () => {
    expect(definitionsForCategory()).toEqual([]);
  });

  it("uses stable row identifiers instead of editable values as React keys", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/vendor/ProductSpecificationsEditor.tsx"), "utf8");
    expect(source).toContain("key={row.id}");
    expect(source).not.toContain("key={`${item.name}-${index}`}");
  });
});
