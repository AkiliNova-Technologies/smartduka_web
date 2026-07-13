"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Heart,
  ShoppingCart,
  LayoutGrid,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Calendar,
  Package,
} from "lucide-react";
import { IconRosetteDiscountCheckFilled } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// ─── Types ───

interface StoreData {
  id: string;
  name: string;
  slug: string;
  logo: string;
  banner: string | null;
  verified: boolean;
  rating: number;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string;
  country: string;
  totalProducts: number;
  joinedAt: string;
  documents: number;
}

interface StoreProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  inventoryCount: number;
  status: string;
  image: string;
  images: { id: string; url: string; isFeatured: boolean }[];
  categoryId: string | null;
  categoryName: string | null;
  subCategoryName: string | null;
  rating: number;
  reviews: number;
  sizes: string[];
  colors: string[];
  tags: string[];
  vendorId: string;
}

interface ProductCategory {
  id: string;
  name: string;
}

interface StoreProfileContentProps {
  store: StoreData;
  products: StoreProduct[];
  categories: ProductCategory[];
}

export function StoreProfileContent({
  store,
  products,
  categories,
}: StoreProfileContentProps) {
  const [activeTab, setActiveTab] = useState<"products" | "reviews">(
    "products",
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.categoryId === selectedCategory);

  const storeDescription =
    store.description ||
    `Discover authentic premium product lines managed directly by ${store.name}. Enjoy local Kampala speed-delivery and fully safe mobile money escrow support.`;

  const joinedDate = new Date(store.joinedAt);

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 selection:bg-emerald-500/10 selection:text-emerald-700">
      {/* 1. BREADCRUMB & CONTROL ROW */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/brands"
            className="p-2 border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all shrink-0"
            title="Back to Dukas">
            <ChevronLeft className="w-4 h-4" />
          </Link>

          <div className="min-w-0">
            {/* Breadcrumb path */}
            <nav className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700 shrink-0" />
              <Link
                href="/brands"
                className="hover:text-primary transition-colors">
                Dukas
              </Link>
            </nav>

            {/* Store title row */}
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-xl font-medium tracking-tight text-foreground truncate">
                {store.name}
              </h1>
              {store.verified && (
                <IconRosetteDiscountCheckFilled className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              )}
            </div>
          </div>
        </div>

        {/* Wishlist action */}
        <button className="w-9 h-9 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-border/40 dark:border-zinc-700 shadow-xs transition-all hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-zinc-800 hover:scale-110 active:scale-90 shrink-0">
          <Heart className="w-4 h-4" />
        </button>
      </div>

      {/* 2. STORE HERO BANNER */}
      <div className="bg-card text-card-foreground rounded-[24px] border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none overflow-hidden">
        {/* Banner Image */}
        {store.banner && (
          <div className="aspect-[5/1] w-full relative overflow-hidden bg-zinc-100 dark:bg-zinc-900">
            <Image
              src={store.banner}
              alt={`${store.name} banner`}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          </div>
        )}

        <div className={cn("p-6 sm:p-8", store.banner ? "" : "pt-6")}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[18px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-border/30 relative shrink-0 shadow-sm">
              <Image
                src={store.logo}
                alt={store.name}
                fill
                className="object-cover"
                sizes="96px"
                priority
              />
            </div>

            {/* Store Identity */}
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {store.name}
                </h1>
                {store.verified && (
                  <IconRosetteDiscountCheckFilled className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-extrabold text-zinc-900 dark:text-zinc-200">
                    {store.rating}
                  </span>
                  <span className="font-normal">rating</span>
                </div>
                <span className="text-border/60 hidden sm:inline">•</span>
                <div className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  <span>{store.totalProducts} products</span>
                </div>
                <span className="text-border/60 hidden sm:inline">•</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Joined{" "}
                    {joinedDate.toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 max-w-3xl leading-relaxed">
                {storeDescription}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TAB NAVIGATION */}
      <div className="flex items-center gap-6 border-b border-border/60 pb-0.5">
        {(["products", "reviews"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-3 text-sm font-bold transition-all relative cursor-pointer capitalize",
              activeTab === tab
                ? "text-zinc-900 dark:text-zinc-50"
                : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300",
            )}>
            <span>{tab}</span>
            {tab === "products" && (
              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-zinc-500">
                {products.length}
              </span>
            )}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* 4. CONTENT */}
      {activeTab === "products" && (
        <div className="space-y-6">
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "h-8 px-3.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
                  selectedCategory === "all"
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-sm"
                    : "bg-muted text-zinc-600 dark:text-zinc-400 hover:bg-border/60",
                )}>
                All ({products.length})
              </button>
              {categories.map((cat) => {
                const count = products.filter(
                  (p) => p.categoryId === cat.id,
                ).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "h-8 px-3.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
                      selectedCategory === cat.id
                        ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-sm"
                        : "bg-muted text-zinc-600 dark:text-zinc-400 hover:bg-border/60",
                    )}>
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border/60 rounded-[24px]">
              <LayoutGrid className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                No products in this category
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Try selecting a different category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {filteredProducts.map((product) => {
                const discountPercentage = product.compareAtPrice
                  ? Math.round(
                      ((product.compareAtPrice - product.basePrice) /
                        product.compareAtPrice) *
                        100,
                    )
                  : 0;

                return (
                  <div
                    key={product.id}
                    className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer">
                    <button className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-border/40 dark:border-zinc-700 shadow-xs transition-colors hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-zinc-800 hover:scale-110 active:scale-90">
                      <Heart className="w-4 h-4" />
                    </button>

                    <Link
                      href={`/products/${product.slug || product.id}`}
                      className="flex flex-col h-full flex-1">
                      <div>
                        <div className="aspect-square rounded-[18px] overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative m-2 mb-0 border border-border/20">
                          <Image
                            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                            src={product.image || "/placeholder-product.png"}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pt-0.5">
                            {product.brand || store.name}
                          </p>
                          <h5 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 tracking-tight transition-colors group-hover:text-primary">
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
                      <button className="w-9 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-xs transition-all duration-200 active:scale-95 hover:bg-primary dark:hover:bg-primary dark:hover:text-white">
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "reviews" && (
        <div className="max-w-3xl space-y-4">
          <div className="text-center py-20 bg-card border border-border/60 rounded-[24px]">
            <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              No reviews yet
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs mx-auto">
              Be the first to review products from {store.name}. Your feedback
              helps other shoppers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
