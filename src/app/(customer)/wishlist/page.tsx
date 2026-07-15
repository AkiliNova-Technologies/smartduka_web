"use client";

import { Trash2, ShoppingCart, ShoppingBag, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useUserData } from "@/providers/UserDataProvider";
import { Skeleton } from "@/components/ui/skeleton";

function WishlistSkeleton() {
  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <div className="border-b border-border/60 pb-6 space-y-2">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-7 w-48 rounded-md" />
        <Skeleton className="h-3 w-72 rounded-md" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-[24px] border border-border/60 overflow-hidden">
            <Skeleton className="aspect-square m-2 rounded-[18px]" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WishlistPage() {
  const { wishlist, wishlistLoading, removeFromWishlist, addToCart } =
    useUserData();

  if (wishlistLoading && wishlist.length === 0) return <WishlistSkeleton />;

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 selection:bg-emerald-500/10 selection:text-emerald-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            My Wishlist
          </h1>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            {wishlist.length} item{wishlist.length !== 1 ? "s" : ""} saved from
            different stores.
          </p>
        </div>
      </div>

      {/* Empty state */}
      {wishlist.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/60 rounded-[24px] space-y-3">
          <ShoppingBag className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            Your wishlist is empty
          </h3>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Save items as you browse to keep track of what you love.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 px-4 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-full text-xs font-bold hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all active:scale-95">
            Browse All Products
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {wishlist.map((item) => {
            return (
              <div
                key={item.productId}
                className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
                {/* Remove button */}
                <button
                  onClick={() => removeFromWishlist(item.productId)}
                  className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-border/40 dark:border-zinc-700 shadow-xs transition-all hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-zinc-800 hover:scale-110 active:scale-90 cursor-pointer"
                  title="Remove from Wishlist">
                  <Trash2 className="w-4 h-4" />
                </button>

                <Link
                  href={`/products/${item.slug || item.productId}`}
                  className="flex flex-col h-full flex-1">
                  <div>
                    <div className="aspect-square rounded-[18px] overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative m-2 mb-0 border border-border/20">
                      <Image
                        src={item.image || "/placeholder-product.png"}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 25vw"
                        loading="lazy"
                      />
                    </div>

                    <div className="space-y-1 px-4 pt-3">
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        {item.brand || item.vendorName}
                      </p>
                      <h3 className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 tracking-tight group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>
                    </div>
                  </div>
                </Link>

                <div className="flex justify-between items-center mt-4 pt-1 px-4 pb-4 relative z-10">
                  <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50">
                    UGX{" "}
                    {item.price?.toLocaleString?.() ||
                      item.basePrice?.toLocaleString?.() ||
                      "0"}
                  </span>
                  <button
                    onClick={() =>
                      addToCart({
                        productId: item.productId,
                        name: item.name,
                        image: item.image || "",
                        price: item.price || item.basePrice || 0,
                        vendorId: "",
                        vendorName: item.vendorName || "",
                      })
                    }
                    className="w-9 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-xs transition-all duration-200 active:scale-95 hover:bg-primary dark:hover:bg-primary dark:hover:text-white cursor-pointer"
                    title="Add to Cart">
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
