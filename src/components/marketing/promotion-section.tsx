import type { PromotionPlacement } from "@prisma/client";
import { HeroSection } from "@/components/home/HeroSection";
import { HeroCarousel, PromotionCarousel, type HeroSlide } from "@/components/marketing/promotion-carousel";
import { MarketingService } from "@/services/marketing";

const placementFallbacks: Partial<Record<PromotionPlacement, HeroSlide>> = {
  PRODUCTS: { id: "products-discovery", eyebrow: "Discover your next favourite", title: "Explore amazing products from trusted vendors.", description: "Fashion, electronics, home essentials and more — all in one place.", ctaLabel: "Explore Products", href: "/products", desktopImage: "/images/promotions/products-banner.webp", imageAlt: "Curated fashion and lifestyle products", imagePosition: "68% center", textScrim: true },
  SHOPS: { id: "shops-discovery", eyebrow: "Discover shops worth exploring", title: "Meet the creative businesses behind the products.", description: "Support local sellers and explore their unique collections.", ctaLabel: "Explore Shops", href: "/shops", desktopImage: "/images/promotions/shops-banner.webp", imageAlt: "Entrepreneur in a local boutique", imagePosition: "68% center", textScrim: true },
};

export async function PromotionSection({ placement, compact = false }: { placement: PromotionPlacement; compact?: boolean }) {
  const data = await MarketingService.publicPromotions(placement);
  const fallback = placementFallbacks[placement];
  if (data.length) return <PromotionCarousel promotions={data} size={compact ? "compact" : "hero"} />;
  if (fallback) return <HeroCarousel slides={[fallback]} size={compact ? "compact" : "hero"} />;
  return placement === "HOMEPAGE" ? <HeroSection /> : null;
}
