import { HeroSection } from "@/components/home/HeroSection";
import { CategoryBento } from "@/components/home/CategoryBento";
import { PromoGrid } from "@/components/home/PromoGrid";
import { ProductGrid } from "@/components/home/ProductGrid";
import { ScrollToTop } from "@/components/scroll-to-top";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <HeroSection />
      <CategoryBento />
      <PromoGrid />  
      <ProductGrid />
      <ScrollToTop />
    </div>
  );
}