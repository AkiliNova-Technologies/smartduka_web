"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingBag,
  Star,
  Heart,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserData } from "@/providers/UserDataProvider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId: string | null;
  parent: { id: string; name: string; slug: string } | null;
  subCategories: {
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    parentId: string | null;
    _count: { products: number };
  }[];
  _count: { products: number; subCategories: number };
}

interface ProductData {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  image: string;
  vendorId: string;
  vendorName: string;
  rating: number;
  reviews: number;
}

interface Props {
  category: CategoryData;
  products: ProductData[];
}

export function CategoryDetailContent({ category, products }: Props) {
  const router = useRouter();
  const { isWishlisted, toggleWishlist, addToCart } = useUserData();
  const [sortBy, setSortBy] = useState("recommended");

  const handleSortChange = (value: string) => {
    setSortBy(value);
    router.push(`/categories/${category.slug}?sort=${value}`);
  };

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300 w-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              if (category.parent) {
                router.push(`/categories/${category.parent.slug}`);
              } else {
                router.push("/categories");
              }
            }}
            className="p-2 border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            {/* Title + badge */}
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-xl font-medium tracking-tight text-foreground truncate">
                {category.name}
              </h1>
              {category._count?.products ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-muted/50 text-muted-foreground shrink-0">
                  {category._count.products} products
                </span>
              ) : null}
            </div>

            {/* Subtitle */}
            <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">
              {category.description ||
                `${category.subCategories.length} subcategories`}
            </p>
          </div>
        </div>

        {/* Sort + wishlist action */}
        <div className="flex items-center gap-2 shrink-0">
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="h-9 rounded-full text-xs font-bold border-border/60 bg-card min-w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/60">
              <SelectGroup>
                <SelectItem
                  value="recommended"
                  className="text-xs font-medium rounded-lg">
                  Recommended
                </SelectItem>
                <SelectItem
                  value="low-high"
                  className="text-xs font-medium rounded-lg">
                  Price: Low to High
                </SelectItem>
                <SelectItem
                  value="high-low"
                  className="text-xs font-medium rounded-lg">
                  Price: High to Low
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Subcategories row */}
      {category.subCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {category.subCategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/categories/${sub.slug}`}
              className="px-3 py-1.5 bg-muted/50 border border-border/40 rounded-full text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/30 transition-all">
              {sub.name}
              {sub._count?.products ? ` (${sub._count.products})` : ""}
            </Link>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3.5">
          <div className="w-14 h-14 bg-muted border border-border/40 rounded-2xl flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              No Products Yet
            </h3>
            <p className="text-xs font-semibold text-muted-foreground leading-normal">
              Products are being added to this category. Check back soon.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {products.map((product) => {
            const discountPercentage = product.compareAtPrice
              ? Math.round(
                  ((product.compareAtPrice - product.basePrice) /
                    product.compareAtPrice) *
                    100,
                )
              : 0;
            const wishlisted = isWishlisted(product.id);

            return (
              <div
                key={product.id}
                className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
                {/* Wishlist button */}
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
                      compareAtPrice: product.compareAtPrice,
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
                      {discountPercentage > 0 && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-orange-600 text-white rounded-md font-bold text-[9px] uppercase tracking-wider shadow-sm">
                          -{discountPercentage}% OFF
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
