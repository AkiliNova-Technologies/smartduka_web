import { HeroSection } from "@/components/home/HeroSection";
import { CategoryBento } from "@/components/home/CategoryBento";
import { PromoGrid } from "@/components/home/PromoGrid";
import { ProductGrid } from "@/components/home/ProductGrid";
import { ScrollToTop } from "@/components/scroll-to-top";
import { getDealsAction, getNewArrivalsAction } from "@/actions/product";

interface HomeProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  image: string;
  vendorId: string;
  vendorName: string;
  rating: number;
  reviews: number;
}

export default async function ProductsPage() {
  const [dealsResult, newArrivalsResult] = await Promise.all([
    getDealsAction(),
    getNewArrivalsAction(10),
  ]);

  const deals: HomeProduct[] = dealsResult.success ? (dealsResult.data ?? []) as HomeProduct[] : [];
  const newArrivals: HomeProduct[] = newArrivalsResult.success ? (newArrivalsResult.data ?? []) as HomeProduct[] : [];

  return (
    <div className="space-y-6">
      <HeroSection />
      <CategoryBento />
      <PromoGrid />
      <ProductGrid deals={deals} newArrivals={newArrivals} />
      <ScrollToTop />
    </div>
  );
}