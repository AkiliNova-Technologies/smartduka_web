"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FeaturedShopCard } from "@/components/marketing/featured-shop-card";
import type { FeaturedShopDto } from "@/lib/marketing-client";

export function FeaturedShopsCarousel({ shops }: { shops: FeaturedShopDto[] }) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const touchStart = React.useRef<number | null>(null);
  const multipleShops = shops.length > 1;

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  React.useEffect(() => {
    if (!multipleShops || paused || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % shops.length), 6000);
    return () => window.clearInterval(timer);
  }, [multipleShops, paused, reducedMotion, shops.length]);

  if (!shops.length) return null;

  const currentIndex = index < shops.length ? index : 0;
  const goTo = (nextIndex: number) => setIndex((nextIndex + shops.length) % shops.length);
  const move = (direction: -1 | 1) => goTo(currentIndex + direction);

  return (
    <div
      aria-roledescription="carousel"
      aria-label="Featured shops"
      tabIndex={0}
      onKeyDown={(event) => {
        if (!multipleShops) return;
        if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
        if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null || !multipleShops) return;
        const end = event.changedTouches[0]?.clientX ?? touchStart.current;
        if (Math.abs(end - touchStart.current) > 40) move(end < touchStart.current ? 1 : -1);
        touchStart.current = null;
      }}
      className="group relative isolate overflow-hidden rounded-3xl bg-muted shadow-xl shadow-black/10 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div key={shops[currentIndex].id} role="group" aria-label={`${currentIndex + 1} of ${shops.length}`} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
        <FeaturedShopCard shop={shops[currentIndex]} priority={currentIndex === 0} />
      </div>
      {multipleShops ? <>
        <button type="button" aria-label="Previous featured shops" onClick={() => move(-1)} className="absolute left-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55 focus-visible:grid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:grid"><ChevronLeft aria-hidden="true" className="size-5" /></button>
        <button type="button" aria-label="Next featured shops" onClick={() => move(1)} className="absolute right-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55 focus-visible:grid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:grid"><ChevronRight aria-hidden="true" className="size-5" /></button>
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full bg-black/25 px-2 py-1.5 backdrop-blur-sm" aria-label="Featured shop slides">
          {shops.map((shop, shopIndex) => <button key={shop.id} type="button" aria-label={`Show featured shop ${shopIndex + 1}`} aria-current={shopIndex === currentIndex ? "true" : undefined} onClick={() => goTo(shopIndex)} className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${shopIndex === currentIndex ? "w-6 bg-white" : "w-2.5 bg-white/60 hover:bg-white"}`} />)}
        </div>
      </> : null}
    </div>
  );
}
