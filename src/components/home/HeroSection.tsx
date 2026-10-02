import { HeroCarousel, type HeroSlide } from "@/components/marketing/promotion-carousel";

export const HOME_HERO_SLIDES: HeroSlide[] = [
  {
    id: "new-arrivals",
    eyebrow: "Fresh on SmartDuka",
    title: "New arrivals",
    highlight: "worth discovering.",
    description: "The latest finds from local shops, selected to make every day feel a little more new.",
    ctaLabel: "Shop new arrivals",
    href: "/new-arrivals",
    desktopImage: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "New fashion arrivals on display",
    textScrim: true,
  },
  {
    id: "fashion",
    eyebrow: "Style, locally sourced",
    title: "Your next look",
    highlight: "starts here.",
    description: "Find fresh fashion, footwear, and everyday essentials from shops you will love.",
    ctaLabel: "Explore fashion",
    href: "/categories/fashion",
    desktopImage: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Fashion clothing collection",
    textScrim: true,
  },
  {
    id: "electronics",
    eyebrow: "Better value, closer to home",
    title: "Upgrade your",
    highlight: "everyday tech.",
    description: "Discover standout electronics and practical deals from trusted local sellers.",
    ctaLabel: "Shop electronics",
    href: "/categories/electronics",
    desktopImage: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Modern electronics on a desk",
    textScrim: true,
  },
  {
    id: "home-living",
    eyebrow: "Make space for comfort",
    title: "Home feels",
    highlight: "better together.",
    description: "Bring warmth, function, and personality into every room with local finds for home and living.",
    ctaLabel: "Shop home & living",
    href: "/categories/home-living",
    desktopImage: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Comfortable modern living room",
    textScrim: true,
  },
];

export function HeroSection() {
  return <HeroCarousel slides={HOME_HERO_SLIDES} />;
}
