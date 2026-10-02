import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("vendor initial request deduplication", () => {
  it("shares in-flight catalogue requests across strict-mode effect replays", () => {
    const catalog = source("src/providers/VendorCatalogProvider.tsx");
    expect(catalog).toContain("productsRequestRef");
    expect(catalog).toContain("if (productsRequestRef.current) return productsRequestRef.current");
  });

  it("shares reviews and finance initial requests without widening vendor scope", () => {
    expect(source("src/app/(vendor)/vendor/reviews/page.tsx")).toContain("if (requestRef.current) return requestRef.current");
    expect(source("src/app/(vendor)/vendor/finance/page.tsx")).toContain("if (requestRef.current) return requestRef.current");
  });
});
