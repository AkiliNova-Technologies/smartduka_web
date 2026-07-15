import { HeroSection } from "@/components/home/HeroSection";
import { CategoryBento } from "@/components/home/CategoryBento";
import { PromoGrid } from "@/components/home/PromoGrid";
import { ProductGrid } from "@/components/home/ProductGrid";
import { ScrollToTop } from "@/components/scroll-to-top";
import { CustomerSidebar } from "@/components/layout/CustomerSidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Suspense } from "react";
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

export default async function HomePage() {
  const [dealsResult, newArrivalsResult] = await Promise.all([
    getDealsAction(),
    getNewArrivalsAction(10),
  ]);

  const deals: HomeProduct[] = dealsResult.success ? (dealsResult.data ?? []) as HomeProduct[] : [];
  const newArrivals: HomeProduct[] = newArrivalsResult.success ? (newArrivalsResult.data ?? []) as HomeProduct[] : [];

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background selection:bg-emerald-500/10 selection:text-emerald-700 antialiased overflow-x-hidden">
        <CustomerSidebar variant="floating" />

        <SidebarInset className="min-h-screen flex flex-col bg-transparent transition-all duration-300 w-full min-w-0">
          <Suspense
            fallback={
              <div className="h-20 w-full bg-muted/20 rounded-full animate-pulse mt-2" />
            }>
            <Header />
          </Suspense>

          <main className="flex-1 flex flex-col lg:flex-row px-4 sm:px-6 lg:px-8 py-6 lg:py-10 gap-6 lg:gap-12 max-w-8xl w-full mx-auto min-w-0">
            <div className="flex-1 min-w-0 w-full space-y-6 relative">
              <HeroSection />
              <CategoryBento />
              <PromoGrid />
              <ProductGrid deals={deals} newArrivals={newArrivals} />
              <ScrollToTop />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}