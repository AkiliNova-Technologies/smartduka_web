import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(`${process.cwd()}/src/app/(admin)/admin/test-data-cleanup/test-data-cleanup-page.tsx`, "utf8");
const hook = readFileSync(`${process.cwd()}/src/hooks/use-test-data-cleanup.ts`, "utf8");
const client = readFileSync(`${process.cwd()}/src/lib/test-data-cleanup-client.ts`, "utf8");

describe("test-data cleanup UI boundary", () => {
  it("keeps endpoint knowledge in the typed client and async state in the hook", () => {
    expect(page).not.toContain("/api/");
    expect(page).not.toContain("fetch(");
    expect(hook).toContain("AbortController");
    expect(client).toContain("/api/admin/test-data-cleanup/preview");
  });

  it("uses AlertDialog, exposes every constrained mode, and requires the exact phrase", () => {
    expect(page).toContain("AlertDialog");
    expect(page).toContain("Selected test account");
    expect(page).toContain("Selected test shop");
    expect(page).toContain("Selected test batch");
    expect(page).toContain("All eligible test data");
    expect(page).toContain('const CONFIRMATION = "DELETE TEST DATA"');
    expect(page).not.toMatch(/window\.(confirm|prompt|alert)/);
  });
});
