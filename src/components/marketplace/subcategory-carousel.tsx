"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryCard, type MarketplaceCategoryCard } from "@/components/marketplace/category-card";

export function SubcategoryCarousel({ categories }: { categories: MarketplaceCategoryCard[] }) {
  const viewport = React.useRef<HTMLDivElement>(null);
  const [canScrollBack, setCanScrollBack] = React.useState(false);
  const [canScrollForward, setCanScrollForward] = React.useState(false);

  const updateControls = React.useCallback(() => {
    const element = viewport.current;
    if (!element) return;
    setCanScrollBack(element.scrollLeft > 1);
    setCanScrollForward(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    updateControls();
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(updateControls);
    observer.observe(element);
    return () => observer.disconnect();
  }, [categories.length, updateControls]);

  const scroll = (direction: 1 | -1) => {
    const element = viewport.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.max(element.clientWidth * 0.8, 200), behavior: "smooth" });
  };

  if (!categories.length) return null;

  return (
    <section aria-labelledby="subcategories" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="subcategories" className="text-base font-semibold tracking-tight text-foreground">
          Subcategories
        </h2>
        {(canScrollBack || canScrollForward) && (
          <div className="hidden items-center gap-2 sm:flex">
            <button type="button" aria-label="Show previous subcategories" disabled={!canScrollBack} onClick={() => scroll(-1)} className="grid size-9 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" aria-label="Show more subcategories" disabled={!canScrollForward} onClick={() => scroll(1)} className="grid size-9 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <div ref={viewport} onScroll={updateControls} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:px-0" tabIndex={0} aria-label="Subcategory navigation">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} variant="compact" className="h-36 w-[11.5rem] shrink-0 snap-start sm:h-40 sm:w-52" />
        ))}
      </div>
    </section>
  );
}
