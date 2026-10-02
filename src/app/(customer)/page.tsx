import { HomeDiscovery } from "@/components/home/HomeDiscovery";
import { ProductGrid } from "@/components/home/ProductGrid";
import { PageContainer } from "@/components/marketplace/page-container";
import { getDealsAction, getNewArrivalsAction } from "@/actions/product";
import { PromotionSection } from "@/components/marketing/promotion-section";
import { FeaturedProductsSection, FeaturedShopsSection } from "@/components/marketing/featured-sections";
import { CategoryService } from "@/services/category";
import { MarketingService } from "@/services/marketing";

export default async function HomePage() {
  const [dealsResult, arrivalsResult, categories, featuredProducts, featuredShops] = await Promise.all([getDealsAction(), getNewArrivalsAction(10), CategoryService.getHomepageCategories(), MarketingService.publicFeaturedProducts(), MarketingService.publicFeaturedShops()]);
  const deals = dealsResult.success ? (dealsResult.data ?? []) : [];
  const newArrivals = arrivalsResult.success ? (arrivalsResult.data ?? []) : [];
  return (
    <PageContainer className="space-y-10 py-6 sm:py-8 lg:py-10">
      <PromotionSection placement="HOMEPAGE" />
      <HomeDiscovery categories={categories} />
      <FeaturedProductsSection products={featuredProducts} />
      <FeaturedShopsSection shops={featuredShops} />
      <ProductGrid deals={deals} newArrivals={newArrivals} />
    </PageContainer>
  );
}
