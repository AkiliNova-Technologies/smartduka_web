import { Suspense } from "react";
import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { VendorCard } from "@/components/marketplace/vendor-card";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { PromotionSection } from "@/components/marketing/promotion-section";
import { MarketplacePagination } from "@/components/marketplace/marketplace-pagination";
import { VendorService } from "@/services/vendor";
import { parseMarketplacePage } from "@/lib/marketplace-page";
import type { PublicShopListing } from "@/lib/public-shop-dto";

type ShopsPageProps = { searchParams: Promise<{ page?: string }> };
const SHOPS_PAGE_SIZE = 12;

function ShopsCards({ stores, priority = false }: { stores: PublicShopListing[]; priority?: boolean }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{stores.map((store, index) => <VendorCard key={store.id} priority={priority && index === 0} vendor={store} />)}</div>;
}

function ShopsGridFallback({ stores }: { stores: PublicShopListing[] }) {
  return <><ShopsCards stores={stores.slice(0, SHOPS_PAGE_SIZE)} priority /><MarketplacePagination total={stores.length} /></>;
}

async function ShopsGrid({ stores, searchParams }: ShopsPageProps & { stores: PublicShopListing[] }) {
  const params = await searchParams;
  const requestedPage = parseMarketplacePage(params.page);
  const pageCount = Math.max(1, Math.ceil(stores.length / SHOPS_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const visibleStores = stores.slice((page - 1) * SHOPS_PAGE_SIZE, page * SHOPS_PAGE_SIZE);
  return <><ShopsCards stores={visibleStores} priority /><MarketplacePagination total={stores.length} /></>;
}

export default async function ShopsPage({ searchParams }: ShopsPageProps) {
  const stores = await VendorService.getPublicStoreListings();
  return (
    <PageContainer className="py-6 sm:py-8">
      <div className="space-y-7">
        <PromotionSection placement="SHOPS" compact />
        <PageHeader title="Browse shops" description="Discover products from local businesses on SmartDuka." />
        {stores.length ? <Suspense fallback={<ShopsGridFallback stores={stores} />}><ShopsGrid stores={stores} searchParams={searchParams} /></Suspense> : <IllustratedEmptyState illustration="/illustrations/empty-shops.svg" title="No shops available yet" description="SmartDuka shops will appear here as they become available." action={{ label: "Browse products", href: "/products" }} />}
      </div>
    </PageContainer>
  );
}
