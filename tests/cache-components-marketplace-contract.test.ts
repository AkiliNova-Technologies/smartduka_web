import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("Cache Components marketplace boundaries", () => {
  it("keeps homepage previews out of URL pagination while full grids retain it", () => {
    const homeGrid = source("src/components/home/ProductGrid.tsx");
    const grid = source("src/components/marketplace/product-grid.tsx");
    const pagination = source("src/components/marketplace/marketplace-pagination.tsx");
    expect(homeGrid).toContain("ProductCardGrid");
    expect(homeGrid).not.toContain("PaginatedProductGrid");
    expect(grid).toContain("export function PaginatedProductGrid");
    expect(grid).not.toContain("useSearchParams");
    expect(pagination).toContain("<Suspense fallback={<MarketplacePaginationFallback />}>");
  });

  it("streams top-level marketplace query data beneath route boundaries", () => {
    const products = source("src/app/(customer)/products/page.tsx");
    const shops = source("src/app/(customer)/shops/page.tsx");
    expect(products).toContain("<Suspense fallback={<ProductsPageFallback />}>");
    expect(products).toContain("async function ProductsRuntime");
    expect(shops).toContain("<Suspense fallback={<ShopsPageFallback />}>");
    expect(shops).toContain("async function ShopsRuntime");
  });

  it("caches public shop data by slug and tags it for shop mutations", () => {
    const service = source("src/services/vendor.ts");
    const mutations = source("src/actions/vendor-settings.ts");
    const page = source("src/app/(customer)/shops/[vendorSlug]/page.tsx");
    expect(service).toContain('"use cache"');
    expect(service).toContain("cacheTags.shopSlug(vendorSlug)");
    expect(service).toContain("cacheTags.shop(vendorProfile.id)");
    expect(mutations).toContain("updateTag(cacheTags.shop(context.vendorId))");
    expect(page).toContain("<Suspense fallback={<StoreProfilePageFallback />}>");
    expect(page).toContain("async function StoreProfileRuntime");
    expect(page).toContain("await params");
    expect(page).not.toContain("prisma.");
  });

  it("isolates pathname-aware mobile navigation and deduplicates review eligibility reads", () => {
    expect(source("src/app/(customer)/layout.tsx")).toContain("<MobileCommerceNavFallback />");
    const reviewEntry = source("src/components/reviews/ReviewEntryPoint.tsx");
    expect(reviewEntry).toContain("eligibilityRequests");
    expect(reviewEntry).toContain("<Suspense fallback={<ReviewEntryPointFallback />}>");
  });
});
