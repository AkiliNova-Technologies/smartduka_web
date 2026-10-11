import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("release hardening contracts", () => {
  it("derives metadataBase only from configured deployment origins", () => {
    const layout = source("src/app/layout.tsx");
    expect(layout).toContain("NEXT_PUBLIC_APP_URL");
    expect(layout).toContain("VERCEL_PROJECT_PRODUCTION_URL");
    expect(layout).toContain("metadataBase: canonicalProductionUrl");
    expect(layout).not.toMatch(/metadataBase:\s*new URL\(["'][^"']+["']\)/);
  });

  it("requires a localhost-only named database and explicit marker before destructive promotion setup", () => {
    const integrationTest = source("tests/promotion-release-db.integration.test.ts");
    const runner = source("scripts/run-promotion-db-tests.mjs");
    expect(integrationTest).toContain('PROMOTION_TEST_DATABASE !== "isolated-local"');
    expect(integrationTest).toContain('databaseUrl.pathname === "/mwezora_promotion_tests"');
    expect(integrationTest).toContain('databaseUrl.hostname === "127.0.0.1"');
    expect(runner).toContain('database = "mwezora_promotion_tests"');
    expect(runner).toContain('PROMOTION_TEST_DATABASE: "isolated-local"');
    expect(runner).toContain("mkdtempSync");
  });
});
