"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/marketplace/product-card";
import type { MarketplaceProduct } from "@/components/marketplace/product-card";
import { MarketplacePagination, MARKETPLACE_PAGE_SIZE } from "@/components/marketplace/marketplace-pagination";

/** A presentational card grid for bounded and curated product collections. */
export function ProductCardGrid({ products }: { products: MarketplaceProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

/** URL-driven pagination belongs only to full marketplace listings. */
export function PaginatedProductGrid({ products, page: requestedPage = 1 }: { products: MarketplaceProduct[]; page?: number }) {
  const pageCount = Math.max(1, Math.ceil(products.length / MARKETPLACE_PAGE_SIZE));
  const page = Math.min(Math.max(Number.isInteger(requestedPage) ? requestedPage : 1, 1), pageCount);
  const visibleProducts = products.slice((page - 1) * MARKETPLACE_PAGE_SIZE, page * MARKETPLACE_PAGE_SIZE);
  return (
    <>
      <ProductCardGrid products={visibleProducts} />
      <MarketplacePagination total={products.length} />
    </>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      aria-label="Loading products"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-border bg-card p-2"
        >
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-2 p-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
