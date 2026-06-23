"use client";

import { Trash2, ShoppingCart, ShoppingBag, ArrowRight, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { mockDatabase } from "@/data/mockDatabase";

export default function WishlistPage() {
  // Filter products dynamically using an index state
  const wishlistItems = mockDatabase.products.filter(p => p.isRecommended);

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 selection:bg-emerald-500/10 selection:text-emerald-700">
      
      {/* 1. GROUNDED LOCAL HEADER BLOCK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>My Saved Rotation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            My Wishlist
          </h1>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            Items you have liked from different Kampala dukas, saved securely before they sell out.
          </p>
        </div>
      </div>

      {/* 2. PREMIUM COMPACT SHOWCASE PRODUCT GRID */}
      {wishlistItems.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/60 rounded-[24px] p-6 space-y-3">
          <ShoppingBag className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Your wishlist is empty</h3>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Save pieces as you explore different shops to view or track them here.
          </p>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-emerald-500 pt-1 transition-colors">
            <span>Explore Products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {wishlistItems.map((product) => {
            const discountPercentage = product.originalPrice 
              ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
              : 0;

            return (
              <div 
                key={product.id}
                className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)]"
              >
                {/* Remove from Wishlist Floating Trigger */}
                <button 
                  className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-border/40 dark:border-zinc-700 shadow-xs transition-colors hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-90 cursor-pointer"
                  title="Remove from Wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Main Product Link Context */}
                <Link href={`/products/${product.id}`} className="flex flex-col h-full flex-1">
                  <div>
                    {/* Image Viewport Canvas */}
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

                    {/* Meta Typography Stack */}
                    <div className="space-y-1 px-4 pt-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{product.rating}</span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">({product.reviews || 0})</span>
                      </div>
                      
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pt-0.5">
                        {product.brand}
                      </p>
                      
                      <h3 className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 tracking-tight transition-colors group-hover:text-primary">
                        {product.title}
                      </h3>
                    </div>
                  </div>
                </Link>

                {/* Price and Cart Footer Segment */}
                <div className="flex justify-between items-center mt-4 pt-1 px-4 pb-4 relative z-10">
                  <div className="flex flex-col">
                    {product.originalPrice && (
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 line-through font-medium leading-none mb-0.5">
                        UGX {product.originalPrice.toLocaleString()}
                      </span>
                    )}
                    <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
                      UGX {product.price.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Shopping Cart Button using primary theme tokens */}
                  <button 
                    className="w-9 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-xs transition-all duration-200 active:scale-95 hover:bg-primary dark:hover:bg-primary dark:hover:text-white cursor-pointer"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

    </div>
  );
}