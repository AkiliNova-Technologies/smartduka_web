"use client";

import { useState, useEffect } from "react";
import { Heart, ShoppingCart, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUserData } from "@/providers/UserDataProvider";
import { getProductsByIdsAction } from "@/actions/recently-viewed";

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
  rating?: number;
  reviews?: number;
}

interface ProductGridProps {
  deals: ProductItem[];
  newArrivals: ProductItem[];
}

function ProductCard({ product }: { product: ProductItem }) {
  const { isWishlisted, toggleWishlist, addToCart } = useUserData();
  const wishlisted = isWishlisted(product.id);

  const discountPercent =
    product.discountPercentage ||
    (product.compareAtPrice
      ? Math.round(
          ((product.compareAtPrice - product.basePrice) / product.compareAtPrice) * 100
        )
      : 0);

  return (
    <div className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
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
            : "text-zinc-400 dark:text-zinc-500 hover:text-rose-500"
        )}
      >
        <Heart className={cn("w-4 h-4", wishlisted && "fill-current")} />
      </button>

      <Link href={`/products/${product.slug || product.id}`} className="flex flex-col h-full flex-1">
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
            {discountPercent > 0 && (
              <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-orange-600 text-white rounded-md font-bold text-[9px] uppercase tracking-wider shadow-sm">
                -{discountPercent}% OFF
              </span>
            )}
          </div>

          <div className="space-y-1 px-4 pt-3">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                {product.rating ?? 4.5}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                ({product.reviews ?? 0})
              </span>
            </div>
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              {product.brand || product.vendorName}
            </p>
            <h5 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 tracking-tight group-hover:text-primary transition-colors">
              {product.name}
            </h5>
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
          className="w-9 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-xs transition-all duration-200 active:scale-95 hover:bg-primary dark:hover:bg-primary dark:hover:text-white cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ProductSection({
  title,
  subtitle,
  products,
  viewAllHref,
}: {
  title: string;
  subtitle: string;
  products: ProductItem[];
  viewAllHref: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
            {title}
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">
            {subtitle}
          </p>
        </div>
        <Link
          href={viewAllHref}
          className="h-8 px-4 inline-flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-muted border border-border/40 rounded-full hover:text-white dark:hover:text-zinc-900 hover:bg-zinc-900 dark:hover:bg-zinc-50 transition-colors duration-200 cursor-pointer"
        >
          View All
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
        {products.slice(0, 5).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export function ProductGrid({ deals, newArrivals }: ProductGridProps) {
  const { recentlyViewedIds } = useUserData();
  const [recentlyViewed, setRecentlyViewed] = useState<ProductItem[]>([]);

  useEffect(() => {
    if (recentlyViewedIds.length > 0) {
      getProductsByIdsAction(recentlyViewedIds.slice(0, 5)).then((result) => {
        if (result.success) {
          setRecentlyViewed((result.data ?? []) as ProductItem[]);
        }
      });
    }
  }, [recentlyViewedIds]);

  return (
    <div className="space-y-12 w-full min-w-0">
      <ProductSection
        title="Flash Sales & Best Markdowns"
        subtitle="High percentage cuts calculated by our automated discount engine."
        products={deals}
        viewAllHref="/deals"
      />

      <ProductSection
        title="New Arrivals"
        subtitle="Latest products and fresh stock uploaded by our dukas."
        products={newArrivals}
        viewAllHref="/new-arrivals"
      />

      {recentlyViewed.length > 0 && (
        <ProductSection
          title="Recently Viewed"
          subtitle="Pick up right where you left off."
          products={recentlyViewed}
          viewAllHref="/new-arrivals"
        />
      )}
    </div>
  );
}