import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("homepage non-blocking rendering contract", () => {
  it("streams independent public sections and does not force request-time rendering", () => {
    const page = source("src/app/(customer)/page.tsx");
    expect(page.match(/<Suspense/g)?.length).toBeGreaterThanOrEqual(5);
    expect(page).not.toContain("connection()");
    expect(page).toContain("Promise.all");
    expect(page).toContain("measureServerOperation");
  });

  it("keeps personalized widgets client-side and deduplicates recommendation work by account revision", () => {
    const grid = source("src/components/home/ProductGrid.tsx");
    expect(grid).toContain("recommendationRequests");
    expect(grid).toContain("sessionRevision");
    expect(grid).toContain("cartLoading");
  });

  it("merges guest history in one transaction instead of serial track-and-trim calls", () => {
    const service = source("src/services/recently-viewed.ts");
    expect(service).toContain("await prisma.$transaction");
    expect(service).toContain("Promise.all(orderedIds.map");
  });
});
