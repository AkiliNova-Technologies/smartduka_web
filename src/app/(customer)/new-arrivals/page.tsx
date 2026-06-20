"use client";

import { 
  Filter, 
  Heart, 
  ShoppingCart, 
  Star, 
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link"; 
import { mockDatabase } from "@/data/mockDatabase";

export default function NewArrivalsPage() {
  const freshArrivalsProducts = mockDatabase.products.filter(
    (p) => p.id.startsWith("arrival-") || p.id.startsWith("new-")
  );

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 selection:bg-emerald-500/10 selection:text-emerald-700">
      
      {/* 1. Feed Configuration Header Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 fill-primary/10" />
            <span>Just Added</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            New Arrivals Today
          </h1>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            See the latest products and fresh stock uploaded by our dukas right now.
          </p>
        </div>
        <div>
          <button className="flex items-center gap-2 px-4 h-9 rounded-full text-xs font-bold bg-muted text-zinc-700 dark:text-zinc-300 border border-border/40 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-50 dark:hover:text-zinc-900 transition-all active:scale-95 cursor-pointer">
            <Filter className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>Filter Feed</span>
          </button>
        </div>
      </div>

      {/* 2. Responsive Catalog Card Streams Grid */}
      <section className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {freshArrivalsProducts.map((product) => {
            const discountPercentage = product.originalPrice
              ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
              : 0;

            const arrivalTag = product.id === "arrival-1" || product.id === "arrival-2" ? "Today" : "Recent";

            return (
              <div
                key={product.id}
                className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out cursor-pointer"
              >
                {/* Wishlist Toggle Pin */}
                <button className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-border/40 dark:border-zinc-700 shadow-xs transition-colors hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-90">
                  <Heart className="w-4 h-4" />
                </button>

                <Link href={`/products/${product.id}`} className="flex flex-col h-full flex-1">
                  <div>
                    {/* Image Canvas Frame Area */}
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
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-orange-600 text-white rounded-md font-bold text-[9px] uppercase tracking-wider shadow-xs">
                          -{discountPercentage}% OFF
                        </span>
                      )}

                      {/* Timeline Metadata Label Tag */}
                      <span className="absolute top-2 left-2 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-2.5 py-0.5 rounded-md text-[10px] font-bold text-primary dark:text-primary border border-border/40 shadow-xs tracking-wide uppercase">
                        {arrivalTag}
                      </span>
                    </div>

                    {/* Metadata Typography Segments */}
                    <div className="space-y-1 px-4 pt-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                          {product.rating}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                          ({product.reviews})
                        </span>
                      </div>
                      
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pt-0.5">
                        {product.brand}
                      </p>
                      
                      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 tracking-tight group-hover:text-primary transition-colors duration-200">
                        {product.title}
                      </h3>
                    </div>
                  </div>
                </Link>

                {/* Price Coordinates & Interaction Footer Button */}
                <div className="flex justify-between items-center mt-4 pt-1 px-4 pb-4 relative z-10">
                  <div className="flex flex-col">
                    {product.originalPrice && (
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 line-through font-medium leading-none mb-0.5">
                        UGX {product.originalPrice.toLocaleString()}
                      </span>
                    )}
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
                      UGX {product.price.toLocaleString()}
                    </span>
                  </div>
                  
                  <button className="w-9 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-xs transition-all duration-200 active:scale-95 hover:bg-primary dark:hover:bg-primary dark:hover:text-white">
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </section>
      
    </div>
  );
}