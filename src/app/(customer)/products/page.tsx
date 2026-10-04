import Link from "next/link";
import { Suspense } from "react";
import { RotateCcw } from "lucide-react";
import { MarketplaceSearch } from "@/components/marketplace/marketplace-search";
import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { PaginatedProductGrid, ProductGridSkeleton } from "@/components/marketplace/product-grid";
import { FilterToolbar } from "@/components/marketplace/filter-toolbar";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { PromotionSection } from "@/components/marketing/promotion-section";
import { CatalogFilters } from "@/components/marketplace/catalog-filters";
import { CategoryService } from "@/services/category";
import { ProductService } from "@/services/product";
import { parseMarketplaceFilters, type MarketplaceProductSearchParams } from "@/lib/marketplace-page";

function MarketplaceSearchFallback() {
  return <div aria-hidden="true" className="h-11 w-full rounded-full border border-input bg-background" />;
}

function FilterToolbarFallback() {
  return <div aria-hidden="true" className="flex h-11 items-center justify-between"><div className="h-4 w-24 rounded bg-muted" /><div className="h-11 w-44 rounded-xl bg-muted" /></div>;
}

type ProductsPageProps = { searchParams: Promise<MarketplaceProductSearchParams> };

function ProductsResultsFallback() {
  return <div className="space-y-6"><FilterToolbarFallback /><ProductGridSkeleton /></div>;
}

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  return (
    <PageContainer className="py-6 sm:py-8 lg:py-10">
      <div className="space-y-6">
        <PromotionSection placement="PRODUCTS" />
        <PageHeader title="Browse products" description="Browse products from local shops on SmartDuka." />
        <div className="md:hidden"><Suspense fallback={<MarketplaceSearchFallback />}><MarketplaceSearch /></Suspense></div>
        <Suspense fallback={<ProductsResultsFallback />}><ProductsRuntime searchParams={searchParams} /></Suspense>
      </div>
    </PageContainer>
  );
}

async function ProductsRuntime({ searchParams }: ProductsPageProps) {
  const { search, sort: catalogSort, page: currentPage, filters: filterInput } = parseMarketplaceFilters(await searchParams);
  const [products, categories, brands, facets] = await Promise.all([
    ProductService.getPublicCatalogProducts({ search, sort: catalogSort, ...filterInput }),
    CategoryService.getCategoryTree({ activeOnly: true }),
    ProductService.getPublicCatalogBrands(),
    ProductService.getPublicCatalogVariantFacets(filterInput),
  ]);
  return (
    <div className="space-y-6">
        {search ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Search results for “{search}”</p><Link href="/products" className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"><RotateCcw className="size-4" />Clear search</Link></div> : null}
            <Suspense fallback={<FilterToolbarFallback />}><FilterToolbar count={products.length} sort={catalogSort}>
              <CatalogFilters categories={categories} brands={brands} sizes={facets.sizes} colors={facets.colors} />
            </FilterToolbar></Suspense>
            {products.length > 0 ? (
              <Suspense fallback={<ProductGridSkeleton />}><PaginatedProductGrid products={products} page={currentPage} /></Suspense>
            ) : (
              <IllustratedEmptyState
                illustration={
                  search
                    ? "/illustrations/empty-search.svg"
                    : "/illustrations/empty-products.svg"
                }
                title={
                  search ? "No products found" : "No products available yet"
                }
                description={
                  search
                    ? `We couldn’t find anything matching “${search}”. Try another search or browse a category.`
                    : "Products from SmartDuka shops will appear here."
                }
                action={{
                  label: search ? "Clear search" : "Browse shops",
                  href: search ? "/products" : "/shops",
                }}
                secondaryAction={
                  search
                    ? { label: "Browse categories", href: "/categories" }
                    : undefined
                }
              />
            )}
    </div>
  );
}
