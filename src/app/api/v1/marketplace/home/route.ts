import { CategoryService } from "@/services/category";
import { MarketingService } from "@/services/marketing";
import { ProductService } from "@/services/product";
import { v1Data, v1Exception } from "@/lib/api/v1/response";

export async function GET() {
  try {
    const [categories, featuredProducts, currentOffers, newArrivals, featuredShops] =
      await Promise.all([
        CategoryService.getHomepageCategories(),
        MarketingService.publicFeaturedProducts(),
        ProductService.getDeals(4),
        ProductService.getNewArrivals(4),
        MarketingService.publicFeaturedShops(),
      ]);
    return v1Data(
      { categories, featuredProducts, currentOffers, newArrivals, featuredShops },
      200,
      { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    );
  } catch (error) {
    return v1Exception(error);
  }
}
