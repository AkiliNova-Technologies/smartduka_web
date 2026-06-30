"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Heart,
  ShoppingCart,
  LayoutGrid,
  MapPin,
  ChevronRight,
  MessageSquare,
  ChevronLeft,
} from "lucide-react";
import { mockDatabase } from "@/data/mockDatabase";
import { Product } from "@/types/marketplace";
import { IconRosetteDiscountCheckFilled } from "@tabler/icons-react";

interface PageProps {
  params: Promise<{ vendorSlug: string }>;
}

export default function StoreProfilePage({ params }: PageProps) {
  const { vendorSlug } = use(params);
  const [activeTab, setActiveTab] = useState<"products" | "reviews">("products");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const store = mockDatabase.stores.find((s) => s.slug === vendorSlug);
  if (!store) notFound();

  const storeProducts = mockDatabase.products.filter(
    (p) => p.storeId === store.id,
  );

  const uniqueCategoryIds = Array.from(
    new Set(storeProducts.map((p) => p.categoryId)),
  );
  const relevantCategories = mockDatabase.categories.filter((c) =>
    uniqueCategoryIds.includes(c.id),
  );

  const filteredProducts =
    selectedCategory === "all"
      ? storeProducts
      : storeProducts.filter((p) => p.categoryId === selectedCategory);

  const storeReviews = [
    { id: "1", author: "Brian K.", rating: 5, date: "2 mins ago", comment: "Fast delivery within Kampala! Product was genuine and escrow option made payment secure.", item: storeProducts[0]?.title },
    { id: "2", author: "Sarah A.", rating: 5, date: "Yesterday", comment: "Great customer care on WhatsApp. Will definitely purchase from this duka again.", item: storeProducts[1]?.title },
    { id: "3", author: "Derrick N.", rating: 4, date: "3 days ago", comment: "Good quality items, accurate descriptions. Highly recommended trader.", item: storeProducts[2]?.title }
  ].filter(r => r.item);

  const storeDescription = `Discover authentic premium product lines managed directly by ${store.name}. Enjoy local Kampala speed-delivery and fully safe mobile money escrow support.`;

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 selection:bg-emerald-500/10 selection:text-emerald-700">

      {/* 1. BREADCRUMB & CONTROL ROW */}
      <div className="flex items-center gap-4 border-b border-border/60 pb-4">
        <div className="flex flex-1 items-center justify-between gap-3">
          <Link
            href="/brands"
            className="w-9 h-9 rounded-full bg-muted text-card-foreground shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] transition-all duration-200 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-50 dark:hover:text-zinc-950 active:scale-95 shrink-0 flex items-center justify-center border border-border/40"
            title="Back to Dukas"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </Link>

          <nav className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            <Link href="/" className="hover:text-primary transition-colors hidden sm:inline">
              Home
            </Link>
            <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700 hidden sm:inline" />
            <Link href="/brands" className="hover:text-primary transition-colors">
              Dukas
            </Link>
            <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
            <span className="text-zinc-900 dark:text-zinc-100 truncate max-w-[140px] sm:max-w-[220px]">
              {store.name}
            </span>
          </nav>
        </div>
      </div>
      
      {/* 2. BRAND IDENTITY HUB BANNER */}
      <div className="bg-card text-card-foreground rounded-[24px] p-6 sm:p-8 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full">
          <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-[18px] overflow-hidden bg-zinc-50 dark:bg-zinc-900 border border-border relative shrink-0">
            <Image
              src={store.logo}
              alt={store.name}
              fill
              className="object-cover"
              priority
              sizes="(max-w-768px) 192px, 208px"
            />
          </div>

          <div className="space-y-3 flex-1">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {store.name}
                </h1>
                {store.verified && (
                  <IconRosetteDiscountCheckFilled className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-extrabold text-zinc-900 dark:text-zinc-200">
                    {store.rating}
                  </span>
                </div>
                <span className="text-border hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span>Kampala, Uganda</span>
                </div>
              </div>
            </div>

            <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 max-w-3xl leading-relaxed">
              {storeDescription}
            </p>

          </div>
        </div>
      </div>

      {/* 3. VIEW MODE CONTROL SLIDERS */}
      <div className="flex items-center gap-6 border-b border-border/60 pb-0.5">
        <button
          onClick={() => setActiveTab("products")}
          className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
            activeTab === "products" ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600"
          }`}
        >
          <span>Products</span>
          {activeTab === "products" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-1.5 cursor-pointer ${
            activeTab === "reviews" ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600"
          }`}
        >
          <span>Reviews</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${activeTab === "reviews" ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950" : "bg-muted text-zinc-500"}`}>
            {storeReviews.length}
          </span>
          {activeTab === "reviews" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      </div>

      {/* 4. CONTENT PANEL CONTAINER WINDOW */}
      {activeTab === "products" ? (
        <div className="space-y-6">
          {/* Sub-Category Filter Row */}
          {relevantCategories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`h-8 px-3.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-sm"
                    : "bg-muted text-zinc-600 dark:text-zinc-400 hover:bg-border/60"
                }`}>
                All ({storeProducts.length})
              </button>
              {relevantCategories.map((cat) => {
                const itemsCount = storeProducts.filter((p) => p.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`h-8 px-3.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedCategory === cat.id
                        ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-sm"
                        : "bg-muted text-zinc-600 dark:text-zinc-400 hover:bg-border/60"
                    }`}>
                    {cat.name} ({itemsCount})
                  </button>
                );
              })}
            </div>
          )}

          {/* Showroom Catalog Layout Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border/60 rounded-[24px]">
              <LayoutGrid className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No items available</h3>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {filteredProducts.map((product: Product) => {
                const discountPercentage = product.originalPrice
                  ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                  : 0;

                return (
                  <div
                    key={product.id}
                    className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)]"
                  >
                    <button className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-border/40 dark:border-zinc-700 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] transition-colors hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-90">
                      <Heart className="w-4 h-4" />
                    </button>

                    <Link href={`/products/${product.id}`} className="flex flex-col h-full flex-1">
                      <div>
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

                        <div className="space-y-1 px-4 pt-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{product.rating}</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">({product.reviews || 0})</span>
                          </div>
                          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pt-0.5">
                            {product.brand || store.name}
                          </p>
                          <h5 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 tracking-tight transition-colors group-hover:text-primary">
                            {product.title}
                          </h5>
                        </div>
                      </div>
                    </Link>

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
                      <button className="w-9 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] transition-all duration-200 active:scale-95 hover:bg-primary dark:hover:bg-primary dark:hover:text-white">
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* MERCHANT REVIEWS FEED PANEL MODE */
        <div className="max-w-8xl space-y-4">
          {storeReviews.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border/60 rounded-[24px]">
              <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No reviews yet</h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Orders fulfilled by this duka will appear here.</p>
            </div>
          ) : (
            storeReviews.map((review) => (
              <div 
                key={review.id} 
                className="bg-card text-card-foreground rounded-[24px] p-5 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{review.author}</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: review.rating }).map((_, idx) => (
                        <Star key={idx} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">{review.date}</span>
                </div>

                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 leading-relaxed">
                  {review.comment}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}