"use client";

import * as React from "react";
import { getImageProps } from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export type PublicPromotion = { id: string; title: string; subtitle: string | null; desktopImageUrl: string; mobileImageUrl: string | null; primaryCtaLabel: string | null; primaryHref: string | null; secondaryCtaLabel: string | null; secondaryHref: string | null; };

export type HeroSlide = {
  id: string;
  eyebrow?: string;
  title: string;
  highlight?: string;
  description?: string;
  ctaLabel: string;
  href: string;
  desktopImage: string;
  mobileImage?: string | null;
  imageAlt: string;
  imagePosition?: string;
  textScrim?: boolean;
};

function ResponsiveSlideImage({ slide, priority }: { slide: HeroSlide; priority: boolean }) {
  const shared = { alt: slide.imageAlt, sizes: "100vw" };
  const { props: desktop } = getImageProps({ ...shared, src: slide.desktopImage, width: 1600, height: 720, quality: 75 });
  const { props: mobile } = getImageProps({ ...shared, src: slide.mobileImage ?? slide.desktopImage, width: 750, height: 900, quality: 75 });

  return (
    <picture className="absolute inset-0">
      {slide.mobileImage && <source media="(max-width: 639px)" srcSet={mobile.srcSet} sizes="100vw" />}
      <source media="(min-width: 640px)" srcSet={desktop.srcSet} sizes="100vw" />
      <img {...mobile} alt={slide.imageAlt} fetchPriority={priority ? "high" : "auto"} className="size-full object-cover" style={{ objectPosition: slide.imagePosition ?? "center" }} />
    </picture>
  );
}

export function HeroCarousel({ slides, size = "hero" }: { slides: HeroSlide[]; size?: "hero" | "compact" }) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const touchStart = React.useRef<number | null>(null);
  const multipleSlides = slides.length > 1;

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  React.useEffect(() => {
    if (!multipleSlides || paused || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [multipleSlides, paused, reducedMotion, slides.length]);

  if (!slides.length) return null;

  const slide = slides[index];
  const goTo = (nextIndex: number) => setIndex((nextIndex + slides.length) % slides.length);
  const move = (direction: 1 | -1) => goTo(index + direction);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured marketplace promotions"
      tabIndex={0}
      onKeyDown={(event) => {
        if (!multipleSlides) return;
        if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
        if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const end = event.changedTouches[0]?.clientX ?? touchStart.current;
        if (Math.abs(end - touchStart.current) > 40) move(end < touchStart.current ? 1 : -1);
        touchStart.current = null;
      }}
      className="group relative isolate overflow-hidden rounded-3xl bg-muted text-white shadow-xl shadow-black/10 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <ResponsiveSlideImage slide={slide} priority={index === 0} />
      {slide.textScrim && <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-black/45 via-black/15 to-transparent sm:w-3/4" aria-hidden="true" />}
      <div className={`relative z-10 flex items-center px-6 py-12 sm:px-10 lg:px-14 ${size === "compact" ? "min-h-72 sm:min-h-80" : "min-h-[25rem] sm:min-h-[28rem] lg:min-h-[30rem]"}`}>
        <div className="max-w-xl">
          {slide.eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">{slide.eyebrow}</p>}
          <h1 className="mt-3 text-3xl font-bold tracking-tight drop-shadow-sm sm:text-4xl lg:text-5xl lg:leading-[1.05]">
            {slide.title}
            {slide.highlight && <span className="mt-1 block">{slide.highlight}</span>}
          </h1>
          {slide.description && <p className="mt-4 max-w-md text-sm leading-6 text-white/90 drop-shadow-sm sm:text-base sm:leading-7">{slide.description}</p>}
          <Link href={slide.href} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900">
            {slide.ctaLabel} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
      {multipleSlides && <>
        <button type="button" aria-label="Previous promotion" onClick={() => move(-1)} className="absolute left-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55 focus-visible:grid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:grid"><ChevronLeft className="size-5" aria-hidden="true" /></button>
        <button type="button" aria-label="Next promotion" onClick={() => move(1)} className="absolute right-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55 focus-visible:grid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:grid"><ChevronRight className="size-5" aria-hidden="true" /></button>
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full bg-black/25 px-2 py-1.5 backdrop-blur-sm" aria-label="Promotion slides">
          {slides.map((item, itemIndex) => <button key={item.id} type="button" aria-label={`Show promotion ${itemIndex + 1}`} aria-current={itemIndex === index ? "true" : undefined} onClick={() => goTo(itemIndex)} className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${itemIndex === index ? "w-6 bg-white" : "w-2.5 bg-white/60 hover:bg-white"}`} />)}
        </div>
      </>}
    </section>
  );
}

export function PromotionCarousel({ promotions, size }: { promotions: PublicPromotion[]; size?: "hero" | "compact" }) {
  const slides: HeroSlide[] = promotions.map((promotion) => ({
    id: promotion.id,
    title: promotion.title,
    description: promotion.subtitle ?? undefined,
    ctaLabel: promotion.primaryCtaLabel ?? "Explore offer",
    href: promotion.primaryHref ?? "/products",
    desktopImage: promotion.desktopImageUrl,
    mobileImage: promotion.mobileImageUrl,
    imageAlt: promotion.title,
  }));
  return <HeroCarousel slides={slides} size={size} />;
}
