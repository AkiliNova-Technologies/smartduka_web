"use client";

import { Heart, ShoppingCart, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { mockDatabase } from "@/data/mockDatabase";
import { Product } from "@/types/marketplace";

// 1. Extracted Sub-component out of the parent render tree to stay fully compatible with the React Compiler
function ProductCard({ product }: { product: Product }) {
  const discountPercentage = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
    : 0;

  return (
    <div className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)]">
      
      {/* Wishlist Trigger Button (Theme aligned with active dark mode variants) */}
      <button className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-border/40 dark:border-zinc-700 shadow-xs transition-colors hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-90 cursor-pointer">
        <Heart className="w-4 h-4" />
      </button>

      {/* Dynamic Product Page Router Wrapper */}
      <Link href={`/products/${product.id}`} className="flex flex-col h-full flex-1">
        <div>
          {/* Image Canvas Viewport */}
          <div className="aspect-square rounded-[18px] overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative m-2 mb-0 border border-border/20">
            <Image
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              src={product.image}
              alt={product.title}
              fill
              sizes="(max-w-768px) 50vw, 25vw"
              loading="lazy"
            />
            {discountPercentage > 0 && (
              <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-orange-600 text-white rounded-md font-bold text-[9px] uppercase tracking-wider shadow-sm">
                -{discountPercentage}% OFF
              </span>
            )}
          </div>

          {/* Typography Content Space */}
          <div className="space-y-1 px-4 pt-3">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{product.rating}</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">({product.reviews})</span>
            </div>
            
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pt-0.5">
              {product.brand}
            </p>
            
            <h5 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 tracking-tight transition-colors group-hover:text-primary">
              {product.title}
            </h5>
          </div>
        </div>
      </Link>

      {/* Currency Pricing Matrix Footer */}
      <div className="flex justify-between items-center mt-4 pt-1 px-4 pb-4 relative z-10">
        <div className="flex flex-col">
          {product.originalPrice && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 line-through font-semibold leading-none mb-0.5">
              UGX {product.originalPrice.toLocaleString()}
            </span>
          )}
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
            UGX {product.price.toLocaleString()}
          </span>
        </div>
        
        {/* Shopping Cart Button utilizing our active platform primary background token */}
        <button className="w-9 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-xs transition-all duration-200 active:scale-95 hover:bg-primary dark:hover:bg-primary dark:hover:text-white cursor-pointer">
          <ShoppingCart className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// 2. Main Product Grid Section Layout Stream
export function ProductGrid() {
  const bestDealsProducts = mockDatabase.products.slice(0, 4).filter(p => p.originalPrice && p.originalPrice > p.price);
  const recommendedProducts = mockDatabase.products.filter(
    (p) => p.isRecommended && (!p.originalPrice || p.price >= p.originalPrice)
  );
  
  // Safely sourcing dynamic recently viewed profiles directly from mock data layers
  const recentlyViewedProducts = mockDatabase.products.slice(2, 6);

  return (
    <div className="space-y-12 w-full min-w-0">
      {/* SECTION 1: BEST DEALS */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
              Flash Sales & Best Markdowns
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">High percentage cuts calculated by our automated discount engine.</p>
          </div>
          <button className="h-8 px-4 inline-flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-muted border border-border/40 rounded-full hover:text-white dark:hover:text-zinc-900 hover:bg-zinc-900 dark:hover:bg-zinc-50 transition-colors duration-200 cursor-pointer">
            View All
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {bestDealsProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* SECTION 2: RECOMMENDATIONS */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
              Recommended For You
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">Premium curated dynamic selections based on your shopping preferences.</p>
          </div>
          <button className="h-8 px-4 inline-flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-muted border border-border/40 rounded-full hover:text-white dark:hover:text-zinc-900 hover:bg-zinc-900 dark:hover:bg-zinc-50 transition-colors duration-200 cursor-pointer">
            View All
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {recommendedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* SECTION 3: RECENTLY VIEWED */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
              Recently Viewed Items
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">Pick up right where you left off checking out fresh fits.</p>
          </div>
          <button className="h-8 px-4 inline-flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-muted border border-border/40 rounded-full hover:text-white dark:hover:text-zinc-900 hover:bg-zinc-900 dark:hover:bg-zinc-50 transition-colors duration-200 cursor-pointer">
            View All
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {recentlyViewedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}