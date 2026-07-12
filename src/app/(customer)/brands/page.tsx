"use client";

import React from "react";
import { Store as StoreIcon, ArrowRight, Star, Layers, Heart } from "lucide-react";
import { IconRosetteDiscountCheckFilled } from '@tabler/icons-react';
import Link from "next/link";
import Image from "next/image";
import { useProducts } from "@/hooks/use-products";
import type { Product } from "@/types/marketplace";

// Helper type for aggregated store info from products
interface AggregatedStore {
  id: string;
  name: string;
  logo: string;
  slug: string;
  verified: boolean;
  rating: number;
  subscriptionPlan: string;
  totalProducts: number;
  primaryCategory: string;
}

export default function BrandsPage() {
  const { products, isLoading, error } = useProducts({
    // No vendorId filter – get all products across all vendors
    limit: 100, // adjust as needed; you could implement pagination later
  });

  // Derive aggregated store list from products
  const stores = React.useMemo(() => {
    const vendorMap = new Map<string, AggregatedStore>();

    products.forEach((product: Product) => {
      const vendorId = product.vendorId;
      if (!vendorId) return; // skip products without a vendor

      const existing = vendorMap.get(vendorId);

      // Count products and categories for this vendor
      if (!existing) {
        vendorMap.set(vendorId, {
          id: vendorId,
          name: product.brand || "Vendor " + vendorId.slice(0, 8),
          logo: product.image, 
          slug: vendorId, 
          verified: false, 
          rating: product.rating ?? 0,
          subscriptionPlan: "Basic", 
          totalProducts: 1,
          primaryCategory: product.categoryId || "General",
        });
      } else {
        existing.totalProducts += 1;
      }
    });

    // Sort by number of products descending (optional)
    return Array.from(vendorMap.values()).sort(
      (a, b) => b.totalProducts - a.totalProducts
    );
  }, [products]);

  if (isLoading) {
    return (
      <div className="max-w-8xl mx-auto px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">Loading stores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-8xl mx-auto px-4 py-10 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 selection:bg-emerald-500/10 selection:text-emerald-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider">
            <StoreIcon className="w-4 h-4 fill-primary/10" />
            <span>Available Shops</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Browse Trusted Dukas
          </h1>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            Find and shop directly from genuine sellers and boutiques registered on our platform.
          </p>
        </div>
      </div>

      <section className="space-y-6">
        {stores.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border/60 rounded-[24px]">
            <StoreIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No stores available</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 sm:gap-6">
            {stores.map((store) => {
              const storeDescription = `Discover authentic premium product lines managed directly by ${store.name}. Enjoy local Kampala speed-delivery and fully safe mobile money escrow support.`;

              return (
                <div
                  key={store.id}
                  className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out cursor-pointer"
                >
                  <button className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-border/40 dark:border-zinc-700 shadow-xs transition-colors hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-90">
                    <Heart className="w-4 h-4" />
                  </button>

                  <Link href={`/brands/${store.slug}`} className="flex flex-col h-full flex-1">
                    <div>
                      <div className="aspect-[16/10] rounded-[18px] overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative m-2 mb-0 border border-border/20">
                        <Image
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          src={store.logo}
                          alt={store.name}
                          fill
                          sizes="(max-w-768px) 100vw, 33vw"
                          loading="lazy"
                        />
                        <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 shadow-xs border border-border/20 z-10">
                          <Layers className="w-3.5 h-3.5 text-orange-500" />
                          <span>{store.primaryCategory}</span>
                        </div>
                      </div>

                      <div className="space-y-1 mt-4 px-5">
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 tracking-tight group-hover:text-primary transition-colors duration-200 leading-tight">
                            {store.name}
                          </h3>
                          {store.verified && (
                            <IconRosetteDiscountCheckFilled className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          )}
                        </div>

                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pt-0.5">
                          {store.subscriptionPlan}
                        </p>

                        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 leading-relaxed pt-1.5 line-clamp-2">
                          {storeDescription}
                        </p>
                      </div>
                    </div>
                  </Link>

                  <div className="flex justify-between items-center mt-5 pt-4 px-5 pb-5 border-t border-border/60 relative z-10">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 leading-none">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">{store.rating}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">{store.totalProducts} products</span>
                    </div>
                    <Link
                      href={`/brands/${store.slug}`}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-4 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-full text-xs font-bold shadow-xs transition-all duration-200 hover:bg-primary dark:hover:bg-primary dark:hover:text-white active:scale-95"
                    >
                      <span>Enter Store</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}