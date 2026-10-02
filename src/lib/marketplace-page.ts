export function parseMarketplacePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function clampMarketplacePage(page: number, pageCount: number): number {
  return Math.min(Math.max(page, 1), Math.max(pageCount, 1));
}

export type MarketplaceProductSearchParams = {
  search?: string; sort?: string; category?: string; minPrice?: string; maxPrice?: string;
  inStock?: string; brand?: string; sizes?: string; colors?: string; page?: string;
};

export function parseMarketplaceFilters(params: MarketplaceProductSearchParams): {
  search: string; sort: CatalogSort; page: number; filters: CatalogFilters;
} {
  const price = (value?: string) => value && /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : undefined;
  return {
    search: params.search?.trim() ?? "",
    sort: params.sort === "price-asc" || params.sort === "price-desc" ? params.sort : "newest",
    page: parseMarketplacePage(params.page),
    filters: {
      categoryId: params.category,
      minPrice: price(params.minPrice),
      maxPrice: price(params.maxPrice),
      inStock: params.inStock === "1",
      brand: params.brand,
      sizes: params.sizes?.split(",").filter(Boolean),
      colors: params.colors?.split(",").filter(Boolean),
    },
  };
}
import type { CatalogFilters, CatalogSort } from "@/services/product";
