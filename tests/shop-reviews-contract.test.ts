import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const shopDetail = fs.readFileSync(
  path.join(process.cwd(), "src/app/(customer)/shops/[vendorSlug]/StoreProfileContent.tsx"),
  "utf8",
);

describe("shop detail reviews", () => {
  it("uses a contained empty state without technical eligibility copy", () => {
    expect(shopDetail).toContain("No shop reviews yet");
    expect(shopDetail).toContain("empty-notifications.svg");
    expect(shopDetail).toContain("showEligibilityMessage={false}");
    expect(shopDetail).not.toContain("after a paid order");
  });

  it("renders the review summary, dates, stars, and vendor replies", () => {
    for (const token of ["store.rating.toFixed(1)", "toLocaleDateString", "Array.from({ length: review.rating })", "Shop reply:"]) {
      expect(shopDetail).toContain(token);
    }
  });
});
