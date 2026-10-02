import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("Shops hydration contract", () => {
  it("does not read browser storage during the public stores initial render", () => {
    const provider = source("src/providers/VendorDataProvider.tsx");

    expect(provider).toContain("const [stores, setStores] = useState<PublicStore[]>([]);");
    expect(provider).toContain("const [isLoading, setIsLoading] = useState(true);");
    expect(provider).toContain("const cached = cachedStores || getSessionStores();");
  });

  it("keeps the Shops page shell stable while shop data loads", () => {
    const page = source("src/app/(customer)/shops/page.tsx");

    expect(page).not.toContain("if (isLoading)");
    expect(page).toContain('aria-label="Loading shops"');
  });

  it("uses supported promotional image quality values", () => {
    const carousel = source("src/components/marketing/promotion-carousel.tsx");

    expect(carousel).toContain("quality: 75");
    expect(carousel).not.toContain("quality: 82");
    expect(carousel).not.toContain("quality: 85");
  });
});
