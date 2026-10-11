import { describe, expect, it } from "vitest";
import { isPublicMarketplaceRead } from "@/proxy";

describe("public mobile catalogue proxy contract", () => {
  it.each([
    "/api/v1/products",
    "/api/v1/products/item-slug",
    "/api/v1/shops",
    "/api/v1/shops/shop-slug",
    "/api/v1/categories",
    "/api/v1/search",
    "/api/v1/marketplace/home",
  ])("allows guest GET requests to %s", (pathname) => {
    expect(isPublicMarketplaceRead("GET", pathname)).toBe(true);
  });

  it("does not make public catalogue writes or customer resources public", () => {
    expect(isPublicMarketplaceRead("POST", "/api/v1/products")).toBe(false);
    expect(isPublicMarketplaceRead("GET", "/api/v1/orders")).toBe(false);
    expect(isPublicMarketplaceRead("GET", "/api/v1/vendor/context")).toBe(false);
  });
});
