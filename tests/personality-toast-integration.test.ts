import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("personality interaction feedback", () => {
  it("keeps the homepage hero first without a standalone greeting", () => {
    const homepage = source("src/app/(customer)/page.tsx");
    expect(homepage).not.toContain("PersonalityWelcome");
    expect(homepage).toContain('<PromotionSection placement="HOMEPAGE" />');
  });

  it("uses the existing Sonner layer and does not alter its neutral styling", () => {
    const toaster = source("src/components/ui/sonner.tsx");
    expect(toaster).toContain('"--normal-bg": "var(--card)"');
    expect(toaster).not.toContain("richColors");
    expect(source("src/providers/UserDataProvider.tsx")).toContain("getPersonalityToastMessage");
    expect(source("src/components/reviews/ReviewDialog.tsx")).toContain("toast.review.submitted");
  });

  it("does not add personality copy to critical transaction surfaces", () => {
    for (const file of ["src/app/(customer)/checkout/page.tsx", "src/providers/UserDataProvider.tsx"]) {
      const contents = source(file);
      const criticalLines = contents.split("\n").filter((line) => /payment|order amount|refund|security/i.test(line));
      expect(criticalLines.some((line) => line.includes("getPersonalityToastMessage"))).toBe(false);
    }
  });
});
