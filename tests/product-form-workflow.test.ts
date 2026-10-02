import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("vendor product form workflow", () => {
  for (const file of ["src/app/(vendor)/vendor/products/new/page.tsx", "src/app/(vendor)/vendor/products/[id]/edit/page.tsx"]) {
    it(`${file} keeps description and a final submit action reachable`, () => {
      const page = source(file);
      expect(page).toContain('id="product-description"');
      expect(page).toContain('type="submit"');
      expect(page).toContain("Stock is managed by your product variants.");
    });
  }
});
