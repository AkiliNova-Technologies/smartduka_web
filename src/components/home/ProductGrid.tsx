"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getProductsByIdsAction } from "@/actions/recently-viewed";
import { getRecommendationsAction } from "@/actions/recommendations";
import { useUserData } from "@/providers/UserDataProvider";
import { ProductCardGrid } from "@/components/marketplace/product-grid";
import type { MarketplaceProduct } from "@/components/marketplace/product-card";
import { SectionHeader } from "@/components/marketplace/section-header";

type ProductItem = MarketplaceProduct;
export function ProductGrid({
  deals,
  newArrivals,
}: {
  deals: ProductItem[];
  newArrivals: ProductItem[];
}) {
  const { recentlyViewedIds, cart } = useUserData();
  const [recommendations, setRecommendations] = useState<ProductItem[]>([]);
  const [recommendationsPersonalized, setRecommendationsPersonalized] = useState(false);
  const cartProductIds = useMemo(() => cart.map((item) => item.productId), [cart]);
  useEffect(() => {
    let current = true;
    getRecommendationsAction({
      recentProductIds: recentlyViewedIds,
      cartProductIds,
      limit: 8,
    }).then((result) => {
      if (current && result.success && result.data) {
        setRecommendations(result.data.products as ProductItem[]);
        setRecommendationsPersonalized(result.data.personalized);
      }
    }).catch(() => {});
    return () => { current = false; };
  }, [recentlyViewedIds, cartProductIds]);
  const section = (
    title: string,
    description: string,
    products: ProductItem[],
    href: string,
  ) =>
    products.length ? (
      <section className="space-y-5">
        <SectionHeader
          title={title}
          description={description}
          action={
            <Link
              href={href}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          }
        />
        <ProductCardGrid products={products.slice(0, 4)} />
      </section>
    ) : null;
  return (
    <div className="w-full space-y-10">
      {section(
        "Current offers",
        "Savings from SmartDuka shops.",
        deals,
        "/deals",
      )}
      {section(
        "New arrivals",
        "Fresh picks from local shops.",
        newArrivals,
        "/new-arrivals",
      )}
      {section(
        recommendationsPersonalized ? "Recommended for you" : "Discover products",
        recommendationsPersonalized
          ? "Picked from what you’ve been exploring."
          : "Popular picks from across SmartDuka.",
        recommendations,
        "/products",
      )}
    </div>
  );
}

/** Kept separate from discovery: this is a lightweight continuation aid. */
export function RecentlyViewedSection() {
  const { recentlyViewedIds, recentlyViewedProducts } = useUserData();
  const [guestRecentlyViewed, setGuestRecentlyViewed] = useState<ProductItem[]>([]);
  const historyIds = useMemo(
    () => [...new Set(recentlyViewedIds)].slice(0, 8),
    [recentlyViewedIds],
  );

  useEffect(() => {
    if (recentlyViewedProducts.length || !historyIds.length) return;
    let current = true;
    getProductsByIdsAction(historyIds).then((result) => {
      if (current && result.success) setGuestRecentlyViewed((result.data ?? []) as ProductItem[]);
    }).catch(() => {});
    return () => { current = false; };
  }, [historyIds, recentlyViewedProducts]);

  const recentlyViewed = recentlyViewedProducts.length
    ? recentlyViewedProducts.slice(0, 8) as ProductItem[]
    : historyIds.length ? guestRecentlyViewed : [];
  if (!recentlyViewed.length) return null;
  return (
    <section className="space-y-3" aria-labelledby="recently-viewed-heading">
      <div className="space-y-0.5">
        <h2 id="recently-viewed-heading" className="text-lg font-semibold tracking-tight text-foreground">Recently viewed</h2>
        <p className="text-sm text-muted-foreground">Continue where you left off.</p>
      </div>
      <ProductCardGrid products={recentlyViewed} />
    </section>
  );
}
