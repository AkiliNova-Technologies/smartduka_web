import { describe, expect, it } from "vitest";
import { selectFeaturedShops, selectHomepageCategories } from "@/components/home/discovery-selection";
import type { HomepageCategory } from "@/services/category";
import type { FeaturedShopDto } from "@/lib/marketing-client";

const category = (id: string): HomepageCategory => ({ id, name: `Category ${id}`, slug: `category-${id}`, image: "", productCount: 1 });
const shop = (id: string): FeaturedShopDto => ({ id, name: `Shop ${id}`, slug: `shop-${id}`, logoUrl: null, bannerUrl: null, description: null, city: null, country: null, productCount: 1, verified: false });

describe("homepage discovery selection", () => {
  it.each([0, 1, 3])("hides sparse category discovery with %i eligible categories", (count) => {
    expect(selectHomepageCategories(Array.from({ length: count }, (_, index) => category(String(index))))).toEqual([]);
  });

  it("shows exactly four eligible categories", () => {
    expect(selectHomepageCategories(["a", "b", "c", "d"].map(category))).toHaveLength(4);
  });

  it("caps category discovery at five eligible categories", () => {
    expect(selectHomepageCategories(["a", "b", "c", "d", "e", "f"].map(category)).map((item) => item.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("hides an empty featured-shop selection and preserves the admin-defined order", () => {
    expect(selectFeaturedShops([])).toEqual([]);
    expect(selectFeaturedShops(["a", "b", "c", "d", "e"].map(shop)).map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
  });
});
