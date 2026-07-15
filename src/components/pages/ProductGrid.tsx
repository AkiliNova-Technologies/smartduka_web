"use client";

import {
  ArrowRight,
  Heart,
  ShoppingBag,
  ShoppingCart,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUserData } from "@/providers/UserDataProvider";

interface ProductItem {
  id: string;
  name: string;
  slug?: string;
  brand: string | null;
  basePrice: number;
  compareAtPrice?: number | null;
  discountPercentage?: number;
  image: string;
  vendorId: string;
  vendorName: string;
  rating: number;
  reviews: number;
  createdAt?: string;
}

interface ProductGridProps {
  title: string;
  subtitle: string;
  badge?: string;
  products: ProductItem[];
  showArrivalBadge?: boolean;
  showDiscountBadge?: boolean;
}

function isRecent(createdAt?: string): boolean {
  if (!createdAt) return false;
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff < 48 * 60 * 60 * 1000; // 48 hours
}

export function ProductGrid({
  title,
  subtitle,
  badge,
  products,
  showArrivalBadge,
  showDiscountBadge,
}: ProductGridProps) {
  const { isWishlisted, toggleWishlist, addToCart } = useUserData();

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10 space-y-8 selection:bg-emerald-500/10 selection:text-emerald-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="max-w-8xl w-full mx-auto">
          <div className="bg-card border border-border/60 rounded-[24px] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none overflow-hidden">
            <div className="p-8 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  No products found
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  {badge === "Deals"
                    ? "No active markdowns right now. Check back soon for fresh discounts."
                    : badge === "Just Added"
                      ? "No new arrivals at the moment. Vendors are adding stock daily."
                      : "Check back soon — our dukas are restocking regularly with fresh inventory."}
                </p>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 px-4 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-full text-xs font-bold hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all active:scale-95">
                Browse All Products
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {products.map((product) => {
            const wishlisted = isWishlisted(product.id);
            const discountPercent =
              product.discountPercentage ||
              (product.compareAtPrice
                ? Math.round(
                    ((product.compareAtPrice - product.basePrice) /
                      product.compareAtPrice) *
                      100,
                  )
                : 0);

            return (
              <div
                key={product.id}
                className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
                {/* Wishlist */}
                <button
                  onClick={() =>
                    toggleWishlist({
                      productId: product.id,
                      name: product.name,
                      slug: product.slug,
                      brand: product.brand,
                      image: product.image,
                      price: product.basePrice,
                      basePrice: product.basePrice,
                      compareAtPrice: product.compareAtPrice ?? null,
                      vendorId: product.vendorId,
                      vendorName: product.vendorName,
                      addedAt: new Date().toISOString(),
                    })
                  }
                  className={cn(
                    "absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center border border-border/40 dark:border-zinc-700 shadow-xs transition-all hover:scale-110 active:scale-90 cursor-pointer",
                    wishlisted
                      ? "text-rose-500 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-rose-500",
                  )}>
                  <Heart
                    className={cn("w-4 h-4", wishlisted && "fill-current")}
                  />
                </button>

                <Link
                  href={`/products/${product.slug || product.id}`}
                  className="flex flex-col h-full flex-1">
                  <div>
                    <div className="aspect-square rounded-[18px] overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative m-2 mb-0 border border-border/20">
                      <Image
                        src={product.image || "/placeholder-product.png"}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 25vw"
                        loading="lazy"
                      />

                      {showDiscountBadge && discountPercent > 0 && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-orange-600 text-white rounded-md font-bold text-[9px] uppercase tracking-wider shadow-xs">
                          -{discountPercent}% OFF
                        </span>
                      )}

                      {showArrivalBadge && (
                        <span className="absolute top-2 left-2 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-2.5 py-0.5 rounded-md text-[10px] font-bold text-primary dark:text-primary border border-border/40 shadow-xs tracking-wide uppercase">
                          {isRecent(product.createdAt) ? "Today" : "Recent"}
                        </span>
                      )}
                    </div>

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
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        {product.brand || product.vendorName}
                      </p>
                      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 tracking-tight group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </div>
                  </div>
                </Link>

                <div className="flex justify-between items-center mt-4 pt-1 px-4 pb-4 relative z-10">
                  <div className="flex flex-col">
                    {product.compareAtPrice && (
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 line-through font-medium leading-none mb-0.5">
                        UGX {product.compareAtPrice.toLocaleString()}
                      </span>
                    )}
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
                      UGX {product.basePrice.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      addToCart({
                        productId: product.id,
                        name: product.name,
                        image: product.image,
                        price: product.basePrice,
                        vendorId: product.vendorId,
                        vendorName: product.vendorName,
                      })
                    }
                    className="w-9 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-xs transition-all duration-200 active:scale-95 hover:bg-primary dark:hover:bg-primary dark:hover:text-white cursor-pointer">
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
