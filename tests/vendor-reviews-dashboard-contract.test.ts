import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("vendor reviews dashboard", () => {
  const page = source("src/app/(vendor)/vendor/reviews/page.tsx");
  const service = source("src/services/reviews.ts");

  it("separates product and shop review DataTables", () => {
    expect(page).toContain('value="product"');
    expect(page).toContain('value="shop"');
    expect(page).toContain("<DataTable");
    expect(page).toContain("Search reviews");
    expect(page).toContain("pagination: true");
  });

  it("calculates dashboard metrics from published reviews only", () => {
    expect(page).toContain('review.status === "PUBLISHED"');
    expect(page).toContain("Average product rating");
    expect(page).toContain("Average shop rating");
    expect(page).toContain("Awaiting your reply");
  });

  it("keeps replies and reports inside the review details Sheet", () => {
    expect(page).toContain("<Sheet");
    expect(page).toContain("/api/vendor/reviews/${kind}/${review.id}/reply");
    expect(page).toContain("/api/reviews/${kind}/${review.id}/report");
    expect(page).toContain("Customer photos");
  });

  it("retains server-side vendor isolation and the enriched display projection", () => {
    expect(service).toContain('requireVendorContext("vendor:manage_shop")');
    expect(service).toContain("product: { vendorId: context.vendorId }");
    expect(service).toContain("where: { vendorId: context.vendorId }");
    expect(service).toContain("imageUrls");
    expect(service).toContain("images: { select: { url: true }");
  });
});
