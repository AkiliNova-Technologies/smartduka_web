import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("marketplace promotion placements", () => {
  const service = source("src/services/marketing.ts");
  const productsPage = source("src/app/(customer)/products/page.tsx");
  const shopsPage = source("src/app/(customer)/shops/page.tsx");
  const carousel = source("src/components/marketing/promotion-carousel.tsx");

  it("keeps all three selectable placements in the existing admin form", () => {
    const fields = source("src/components/marketing/admin/promotion/promotion-placement-fields.tsx");
    expect(fields).toContain('"HOMEPAGE", "PRODUCTS", "SHOPS"');
  });

  it("filters public banners by requested placement, schedule, publication, and priority", () => {
    expect(service).toContain("placements: { has: placement }");
    expect(service).toContain('status: "ACTIVE"');
    expect(service).toContain("startsAt: { lte: now }");
    expect(service).toContain("endsAt: { gt: now }");
    expect(service).toContain('orderBy: [{ priority: "asc" }, { createdAt: "desc" }], take: 5');
  });

  it("does not publish banners whose direct CTA target is no longer eligible", () => {
    expect(service).toContain("vendor: { status: VendorStatus.ACTIVE, deletedAt: null }");
    expect(service).toContain("if (p.primaryCtaType && !primaryHref) return null");
  });

  it("places compact products and shops banners after their headings", () => {
    expect(productsPage.indexOf("<PageHeader")).toBeLessThan(productsPage.indexOf('<PromotionSection placement="PRODUCTS" compact />'));
    expect(shopsPage.indexOf("<PageHeader")).toBeLessThan(shopsPage.indexOf('<PromotionSection placement="SHOPS" compact />'));
  });

  it("keeps shared responsive carousel controls and compact sizing", () => {
    expect(carousel).toContain('size?: "hero" | "compact"');
    expect(carousel).toContain('min-h-72 sm:min-h-80');
    expect(carousel).toContain("onTouchEnd");
    expect(carousel).toContain("prefers-reduced-motion");
  });
});
