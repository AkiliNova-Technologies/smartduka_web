import { HomeDiscovery } from "@/components/home/HomeDiscovery";
import { ProductGrid, RecentlyViewedSection } from "@/components/home/ProductGrid";
import { PageContainer } from "@/components/marketplace/page-container";
import { getDealsAction, getNewArrivalsAction } from "@/actions/product";
import { PromotionSection } from "@/components/marketing/promotion-section";
import { FeaturedProductsSection, FeaturedShopsSection } from "@/components/marketing/featured-sections";
import { CategoryService } from "@/services/category";
import { MarketingService } from "@/services/marketing";
import { Suspense } from "react";
import { connection } from "next/server";

export default function HomePage() {
  return <Suspense fallback={<PageContainer className="min-h-[60vh] py-6 sm:py-8 lg:py-10" />}><HomeRuntime /></Suspense>;
}

async function HomeRuntime() {
  await connection();
  const [dealsResult, arrivalsResult, categoriesResult, featuredProductsResult, featuredShopsResult] = await Promise.allSettled([getDealsAction(), getNewArrivalsAction(10), CategoryService.getHomepageCategories(), MarketingService.publicFeaturedProducts(), MarketingService.publicFeaturedShops()]);
  const dealsResponse = dealsResult.status === "fulfilled" ? dealsResult.value : null;
  const arrivalsResponse = arrivalsResult.status === "fulfilled" ? arrivalsResult.value : null;
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const featuredProducts = featuredProductsResult.status === "fulfilled" ? featuredProductsResult.value : [];
  const featuredShops = featuredShopsResult.status === "fulfilled" ? featuredShopsResult.value : [];
  const deals = dealsResponse?.success ? (dealsResponse.data ?? []) : [];
  const newArrivals = arrivalsResponse?.success ? (arrivalsResponse.data ?? []) : [];
  return (
    <PageContainer className="space-y-10 py-6 sm:py-8 lg:py-10">
      <PromotionSection placement="HOMEPAGE" />
      <HomeDiscovery categories={categories} />
      <FeaturedProductsSection products={featuredProducts} />
      <ProductGrid deals={deals} newArrivals={newArrivals} />
      <FeaturedShopsSection shops={featuredShops} />
      <RecentlyViewedSection />
    </PageContainer>
  );
}
