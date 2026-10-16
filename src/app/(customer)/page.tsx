import { HomeDiscovery } from "@/components/home/HomeDiscovery";
import { ProductGrid, RecentlyViewedSection } from "@/components/home/ProductGrid";
import { PageContainer } from "@/components/marketplace/page-container";
import { PromotionSection } from "@/components/marketing/promotion-section";
import { FeaturedProductsSection, FeaturedShopsSection } from "@/components/marketing/featured-sections";
import { CategoryService } from "@/services/category";
import { MarketingService } from "@/services/marketing";
import { ProductService } from "@/services/product";
import { measureServerOperation } from "@/lib/server/performance";
import { Suspense } from "react";

function SectionFallback({ height = "h-72" }: { height?: string }) {
  return <div aria-hidden="true" className={`${height} animate-pulse rounded-2xl bg-muted/30`} />;
}

async function HomepageCategories() {
  const categories = await measureServerOperation("homepage.categories", () => CategoryService.getHomepageCategories()).catch(() => []);
  return <HomeDiscovery categories={categories} />;
}

async function HomepageFeaturedProducts() {
  const products = await measureServerOperation("homepage.featured-products", () => MarketingService.publicFeaturedProducts()).catch(() => []);
  return <FeaturedProductsSection products={products} />;
}

async function HomepageCatalogue() {
  const [deals, newArrivals] = await Promise.all([
    measureServerOperation("homepage.deals", () => ProductService.getDeals(20)).catch(() => []),
    measureServerOperation("homepage.new-arrivals", () => ProductService.getNewArrivals(10)).catch(() => []),
  ]);
  return <ProductGrid deals={deals} newArrivals={newArrivals} />;
}

async function HomepageFeaturedShops() {
  const shops = await measureServerOperation("homepage.featured-shops", () => MarketingService.publicFeaturedShops()).catch(() => []);
  return <FeaturedShopsSection shops={shops} />;
}

export default function HomePage() {
  return (
    <PageContainer className="space-y-10 py-6 sm:py-8 lg:py-10">
      <Suspense fallback={<SectionFallback height="h-[26rem]" />}><PromotionSection placement="HOMEPAGE" /></Suspense>
      <Suspense fallback={<SectionFallback height="h-44" />}><HomepageCategories /></Suspense>
      <Suspense fallback={<SectionFallback />}><HomepageFeaturedProducts /></Suspense>
      <Suspense fallback={<SectionFallback height="h-[32rem]" />}><HomepageCatalogue /></Suspense>
      <Suspense fallback={<SectionFallback />}><HomepageFeaturedShops /></Suspense>
      <Suspense fallback={null}><RecentlyViewedSection /></Suspense>
    </PageContainer>
  );
}
