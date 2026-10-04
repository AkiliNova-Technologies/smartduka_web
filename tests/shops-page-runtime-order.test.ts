import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("shops page runtime data", () => {
  it("keeps cached listings outside the runtime pagination boundary", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/app/(customer)/shops/page.tsx"), "utf8");
    expect(source).toContain("const stores = await VendorService.getPublicStoreListings()");
    expect(source).toContain("ShopsGridFallback stores={stores}");
    expect(source).toContain("async function ShopsGrid");
    expect(source).toContain("function ShopsGridFallback");
    expect(source).not.toContain("ShopsPageFallback");
    expect(source).toContain("const SHOPS_PAGE_SIZE = 12");
    expect(source).not.toContain("MARKETPLACE_PAGE_SIZE");
  });
});
