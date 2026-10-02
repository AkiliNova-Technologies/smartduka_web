"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProductsByIdsAction } from "@/actions/recently-viewed";
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
  const { recentlyViewedIds } = useUserData();
  const [recentlyViewed, setRecentlyViewed] = useState<ProductItem[]>([]);
  useEffect(() => {
    if (recentlyViewedIds.length)
      getProductsByIdsAction(recentlyViewedIds.slice(0, 5)).then((result) => {
        if (result.success)
          setRecentlyViewed((result.data ?? []) as ProductItem[]);
      });
  }, [recentlyViewedIds]);
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
        "Savings currently available from SmartDuka shops.",
        deals,
        "/deals",
      )}
      {section(
        "New arrivals",
        "Recently listed products from local shops.",
        newArrivals,
        "/new-arrivals",
      )}
      {section(
        "Recently viewed",
        "Continue where you left off.",
        recentlyViewed,
        "/products",
      )}
    </div>
  );
}
