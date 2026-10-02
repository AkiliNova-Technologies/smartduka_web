import type { HomepageCategory } from "@/services/category";
import type { FeaturedShopDto } from "@/lib/marketing-client";

export function selectHomepageCategories(categories: HomepageCategory[]) {
  return categories.length >= 4 ? categories.slice(0, 5) : [];
}

export function selectFeaturedShops(shops: FeaturedShopDto[]) {
  return shops.slice(0, 4);
}
