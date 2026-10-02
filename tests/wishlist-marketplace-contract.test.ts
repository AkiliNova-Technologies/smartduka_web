import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("wishlist marketplace contract", () => {
  it("serializes saved products through the canonical marketplace serializer", () => {
    const service = source("src/services/wishlist.ts");
    const content = source("src/app/(customer)/wishlist/WishlistContent.tsx");
    expect(service).toContain("serializeMarketplaceProduct");
    expect(service).toContain("variants: { select: { isActive: true, inventoryCount: true, price: true } }");
    expect(service).toContain("subCategory:");
    expect(service).toContain('reviews: { where: { status: "PUBLISHED" }');
    expect(content).toContain("product={{ ...item, id: item.productId }}");
  });

  it("uses the shared 12-card URL pagination control", () => {
    const page = source("src/app/(customer)/wishlist/page.tsx");
    const content = source("src/app/(customer)/wishlist/WishlistContent.tsx");
    const pagination = source("src/components/marketplace/marketplace-pagination.tsx");
    expect(page).toContain("<Suspense fallback={<WishlistPageFallback />}>");
    expect(page).not.toContain("useSearchParams");
    expect(content).toContain("MARKETPLACE_PAGE_SIZE");
    expect(content).toContain("paginatedWishlist");
    expect(content).toContain("router.replace");
    expect(pagination).toContain("MARKETPLACE_PAGE_SIZE = 12");
    expect(pagination).toContain('params.set("page"');
  });
});
