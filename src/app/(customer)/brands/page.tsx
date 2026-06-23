"use client";

import { Store as StoreIcon, ArrowRight, Star, Layers, Heart } from "lucide-react";
import { IconRosetteDiscountCheckFilled } from '@tabler/icons-react';
import Link from "next/link";
import Image from "next/image";
import { mockDatabase } from "@/data/mockDatabase"; 
import { Store } from "@/types/marketplace";

export default function BrandsPage() {
  // Query stores dynamically straight from the centralized mock data backbone layer
  const activeMerchantStores = mockDatabase.stores;

  // Relational helper function to compute products and primary categories dynamically
  const getStoreStats = (storeId: string) => {
    const storeProducts = mockDatabase.products.filter((p) => p.storeId === storeId);
    
    // Find the most frequent categoryId in the merchant's sub-catalog
    const categoryCounts = storeProducts.reduce((acc, current) => {
      acc[current.categoryId] = (acc[current.categoryId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategoryId = Object.keys(categoryCounts).reduce(
      (a, b) => (categoryCounts[a] > categoryCounts[b] ? a : b), 
      mockDatabase.categories[0]?.id || ""
    );

    const categoryName = mockDatabase.categories.find((c) => c.id === topCategoryId)?.name || "General Mall";

    return {
      totalProducts: storeProducts.reduce((acc, curr) => acc + (curr.inventoryCount || 0), 0),
      primaryCategory: categoryName
    };
  };

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 selection:bg-emerald-500/10 selection:text-emerald-700">
      
      {/* 1. Synchronized Page Header Architecture */}
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

      {/* 2. Re-engineered Merchant Stores Layout Grid */}
      <section className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 sm:gap-6">
          {activeMerchantStores.map((store: Store) => {
            // Compute dynamic item counts and category references on the fly
            const stats = getStoreStats(store.id);
            
            const storeDescription = `Discover authentic premium product lines managed directly by ${store.name}. Enjoy local Kampala speed-delivery and fully safe mobile money escrow support.`;

            return (
              <div
                key={store.id}
                className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out cursor-pointer"
              >
                {/* Save Store Button */}
                <button className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-border/40 dark:border-zinc-700 shadow-xs transition-colors hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-90">
                  <Heart className="w-4 h-4" />
                </button>

                {/* Micro-store Link */}
                <Link href={`/brands/${store.slug}`} className="flex flex-col h-full flex-1">
                  <div>
                    {/* Store Banner Area */}
                    <div className="aspect-[16/10] rounded-[18px] overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative m-2 mb-0 border border-border/20">
                      <Image
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        src={store.logo} 
                        alt={store.name}
                        fill
                        sizes="(max-w-768px) 100vw, 33vw"
                        loading="lazy"
                      />
                      {/* Category Identifier Tag */}
                      <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 shadow-xs border border-border/20 z-10">
                        <Layers className="w-3.5 h-3.5 text-orange-500" />
                        <span>{stats.primaryCategory}</span>
                      </div>
                    </div>

                    {/* Metadata Presentation Block */}
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

                {/* Footer Action Block */}
                <div className="flex justify-between items-center mt-5 pt-4 px-5 pb-5 border-t border-border/60 relative z-10">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 leading-none">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">{store.rating}</span>
                    </div>
                  </div>
                
                  <Link 
                    href={`/brands/${store.slug}`} 
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-full text-xs font-bold shadow-xs transition-all duration-200 hover:bg-primary dark:hover:bg-primary dark:hover:text-white active:scale-95"
                  >
                    <span>Enter Store</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}