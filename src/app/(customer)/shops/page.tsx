import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { VendorCard } from "@/components/marketplace/vendor-card";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { PromotionSection } from "@/components/marketing/promotion-section";
import { MarketplacePagination, MARKETPLACE_PAGE_SIZE } from "@/components/marketplace/marketplace-pagination";
import { VendorService } from "@/services/vendor";
import { parseMarketplacePage } from "@/lib/marketplace-page";

type ShopsPageProps = { searchParams: Promise<{ page?: string }> };

function ShopsPageFallback() {
  return <PageContainer className="py-6 sm:py-8"><div className="space-y-7"><div className="h-8 w-40 rounded bg-muted" /><div className="h-5 w-80 max-w-full rounded bg-muted" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[1.6] rounded-xl border bg-muted" />)}</div></div></PageContainer>;
}

export default function ShopsPage({ searchParams }: ShopsPageProps) {
  return <Suspense fallback={<ShopsPageFallback />}><ShopsRuntime searchParams={searchParams} /></Suspense>;
}

async function ShopsRuntime({ searchParams }: ShopsPageProps) {
  const [stores, params] = await Promise.all([VendorService.getPublicStoreListings(), searchParams]);
  const requestedPage = parseMarketplacePage(params.page);
  const pageCount = Math.max(1, Math.ceil(stores.length / MARKETPLACE_PAGE_SIZE));
  const page = Math.min(Math.max(Number.isInteger(requestedPage) ? requestedPage : 1, 1), pageCount);
  const visibleStores = stores.slice((page - 1) * MARKETPLACE_PAGE_SIZE, page * MARKETPLACE_PAGE_SIZE);
  return (
    <PageContainer className="py-6 sm:py-8">
      <div className="space-y-7">
        <PromotionSection placement="SHOPS" compact />
        <PageHeader
          title="Browse shops"
          description="Discover products from local businesses on SmartDuka."
        />
        {stores.length ? (
          <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleStores.map((store, index) => (
              <VendorCard
                key={store.id}
                priority={index === 0}
                vendor={{
                  id: store.id,
                  name: store.storeName,
                  slug: store.slug,
                  logoUrl: store.logoUrl,
                  bannerUrl: store.bannerUrl,
                  description: store.description,
                  city: store.city,
                  country: store.country,
                  productCount: store._count.products,
                  verified: store.isVerified,
                }}
              />
            ))}
          </div>
          <MarketplacePagination total={stores.length} />
          </>
        ) : (
          <IllustratedEmptyState
            illustration="/illustrations/empty-shops.svg"
            title="No shops available yet"
            description="SmartDuka shops will appear here as they become available."
            action={{ label: "Browse products", href: "/products" }}
          />
        )}
      </div>
    </PageContainer>
  );
}
import { Suspense } from "react";
