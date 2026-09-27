import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src");
const credentialReference = /(?:NEXT_PUBLIC_PESAPAL|PESAPAL_(?:CONSUMER_KEY|CONSUMER_SECRET))/;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("Pesapal credential boundary", () => {
  it("does not reference credentials from a client component or public environment key", () => {
    const clientModules = sourceFiles(root).filter((file) => readFileSync(file, "utf8").includes('"use client"') || readFileSync(file, "utf8").includes("'use client'"));
    for (const file of clientModules) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(credentialReference);
    }
  });
});
