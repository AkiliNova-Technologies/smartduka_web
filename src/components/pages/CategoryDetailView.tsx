"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import {
  ArrowLeft,
  SlidersHorizontal,
  ShoppingBag,
  Star,
  Heart,
  ShoppingCart,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCategories } from "@/hooks/use-categories";
import { Product, CategoryTree } from "@/types/marketplace";
import { mockDatabase } from "@/data/mockDatabase";
import { Skeleton } from "@/components/ui/skeleton";

// ==========================================
// SKELETON COMPONENTS
// ==========================================

function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-[24px] p-0 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:border-zinc-800/80 dark:shadow-none">
      {/* Image skeleton */}
      <div className="aspect-square rounded-[18px] overflow-hidden bg-muted m-2 mb-0">
        <Skeleton className="w-full h-full" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-2 px-4 pt-3">
        <div className="flex items-center gap-1">
          <Skeleton className="w-10 h-3 rounded-full" />
          <Skeleton className="w-6 h-3 rounded-full" />
        </div>
        <Skeleton className="w-16 h-3 rounded-full" />
        <Skeleton className="w-3/4 h-4 rounded-full" />
      </div>

      {/* Price + button skeleton */}
      <div className="flex justify-between items-center mt-4 px-4 pb-4">
        <div className="space-y-1.5">
          <Skeleton className="w-14 h-3 rounded-full" />
          <Skeleton className="w-20 h-5 rounded-full" />
        </div>
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
    </div>
  );
}

function CategoryBubbleSkeleton() {
  return (
    <div className="flex flex-col items-center w-full max-w-[180px]">
      <Skeleton className="aspect-square w-full rounded-full" />
      <Skeleton className="w-20 h-3 rounded-full mt-4" />
      <Skeleton className="w-12 h-2.5 rounded-full mt-1" />
    </div>
  );
}

function CategoryDetailSkeleton() {
  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 border-b border-border/40 pb-5">
        <Skeleton className="w-28 h-4 rounded-full" />

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="w-48 h-8 rounded-full" />
            <Skeleton className="w-72 h-3.5 rounded-full" />
            <Skeleton className="w-56 h-3 rounded-full" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Skeleton className="w-20 h-7 rounded-full" />
            <Skeleton className="w-24 h-7 rounded-full" />
            <Skeleton className="w-16 h-7 rounded-full" />
          </div>

          <div className="flex items-center gap-3">
            <Skeleton className="w-24 h-9 rounded-full" />
            <Skeleton className="w-[140px] h-9 rounded-full" />
          </div>
        </div>
      </div>

      {/* Product grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function CategoryGridIndexSkeleton() {
  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header skeleton */}
      <div className="border-b border-border/60 pb-5 space-y-1.5">
        <Skeleton className="w-48 h-7 rounded-full" />
        <Skeleton className="w-64 h-3.5 rounded-full" />
      </div>

      {/* Category bubbles skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10 justify-items-center">
        {Array.from({ length: 10 }).map((_, i) => (
          <CategoryBubbleSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// PRODUCT CARD COMPONENT
// ==========================================

function ProductCard({ product }: { product: Product }) {
  const discountPercentage = product.compareAtPrice
    ? Math.round(
        ((product.compareAtPrice - product.basePrice) / product.compareAtPrice) * 100
      )
    : 0;

  return (
    <div className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)]">
      <button className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-background flex items-center justify-center text-muted-foreground border border-border/40 shadow-xs transition-colors hover:text-rose-500 active:scale-90 cursor-pointer">
        <Heart className="w-4 h-4" />
      </button>

      <Link
        href={`/products/${product.id}`}
        className="flex flex-col h-full flex-1"
      >
        <div className="aspect-square rounded-[18px] overflow-hidden bg-muted border border-border/20 m-2 mb-0 relative">
          <Image
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            src={product.image}
            alt={product.name}
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
            <span className="text-[11px] font-bold text-foreground">
              {product.rating}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">
              ({product.reviews})
            </span>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pt-0.5">
            {product.brand}
          </p>
          <h5 className="text-sm font-bold text-foreground line-clamp-1 tracking-tight transition-colors group-hover:text-primary">
            {product.name}
          </h5>
        </div>
      </Link>

      <div className="flex justify-between items-center mt-4 pt-1 px-4 pb-4 relative z-10">
        <div className="flex flex-col">
          {product.compareAtPrice && (
            <span className="text-[11px] text-muted-foreground line-through font-semibold leading-none mb-0.5">
              UGX {product.compareAtPrice.toLocaleString()}
            </span>
          )}
          <span className="text-base font-bold text-foreground tracking-tight leading-none">
            UGX {product.basePrice.toLocaleString()}
          </span>
        </div>
        <button className="w-9 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-xs transition-all duration-200 active:scale-95 hover:bg-primary dark:hover:bg-primary dark:hover:text-white cursor-pointer">
          <ShoppingCart className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ==========================================
// INNER CATEGORY VIEW
// ==========================================

function InnerCategoryView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeSlug = searchParams.get("slug");

  const [sortBy, setSortBy] = useState("recommended");

  const { categories, categoriesLoading, error } = useCategories();
  const categoryTree = categories as CategoryTree[];

  const currentCategory = categoryTree.find((c) => c.slug === activeSlug);

  // Loading state — full skeleton
  if (categoriesLoading) {
    return activeSlug ? <CategoryDetailSkeleton /> : <CategoryGridIndexSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center gap-4">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-medium max-w-md text-center">
          {error}
        </div>
        <button
          onClick={() => router.refresh()}
          className="text-xs font-medium text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!activeSlug || !currentCategory)
    return <CategoryGridIndex categories={categoryTree} categoriesLoading={categoriesLoading} />;

  const targetedProducts = mockDatabase.products.filter(
    (p: Product) => p.categoryId === currentCategory.id
  );

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/40 pb-5">
        <button
          onClick={() => router.push("/categories")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors self-start cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>All Categories</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {currentCategory.name}
            </h1>
            {currentCategory.description && (
              <p className="text-xs text-muted-foreground">
                {currentCategory.description}
              </p>
            )}
            <p className="text-xs font-semibold text-muted-foreground">
              {targetedProducts.length > 0
                ? `Discovering ${targetedProducts.length} premium pieces sourced from Kampala accounts.`
                : `${currentCategory._count?.products || 0} products in this category.`}
            </p>
          </div>

          {currentCategory.subCategories &&
            currentCategory.subCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentCategory.subCategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/categories?slug=${sub.slug}`}
                    className="px-3 py-1.5 bg-muted/50 border border-border/40 rounded-full text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/30 transition-all"
                  >
                    {sub.name}
                    {sub._count?.products
                      ? ` (${sub._count.products})`
                      : ""}
                  </Link>
                ))}
              </div>
            )}

          <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto">
            <div className="flex items-center bg-muted border border-border/60 rounded-full px-3 py-1.5 text-xs font-bold text-foreground gap-2 cursor-pointer hover:bg-muted/80 transition-colors w-full sm:w-auto justify-center">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Filters</span>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-card border border-border/60 rounded-full px-4 h-9 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer min-w-[140px]"
            >
              <option value="recommended">Recommended</option>
              <option value="low-high">Price: Low to High</option>
              <option value="high-low">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {targetedProducts.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3.5">
          <div className="w-14 h-14 bg-muted border border-border/40 rounded-2xl flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              No Products Yet
            </h3>
            <p className="text-xs font-semibold text-muted-foreground leading-normal">
              Products are being added to this category. Check back soon or
              browse other categories.
            </p>
          </div>
          <button
            onClick={() => router.push("/categories")}
            className="h-10 px-5 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-full hover:bg-emerald-500 cursor-pointer"
          >
            Browse All Categories
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {targetedProducts.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// CATEGORY GRID INDEX
// ==========================================

function CategoryGridIndex({
  categories,
  categoriesLoading,
}: {
  categories: CategoryTree[];
  categoriesLoading: boolean;
}) {
  const fallbackImage =
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80";

  if (categoriesLoading) {
    return <CategoryGridIndexSkeleton />;
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Shop by Categories
        </h1>
        <p className="text-xs font-semibold text-muted-foreground mt-1">
          Explore {categories.length}+ curated collections from verified local
          dukas.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3.5">
          <div className="w-14 h-14 bg-muted border border-border/40 rounded-2xl flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              No Categories Available
            </h3>
            <p className="text-xs font-semibold text-muted-foreground leading-normal">
              Categories are being set up. Check back soon for curated
              collections.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10 justify-items-center">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories?slug=${cat.slug}`}
              className="group flex flex-col items-center w-full max-w-[180px] outline-none"
            >
              <div className="relative aspect-square w-full rounded-full bg-muted border border-border/40 overflow-hidden shadow-[0_12px_32px_-12px_rgba(0,0,0,0.03)] transition-all duration-500 ease-out group-hover:-translate-y-1.5 group-hover:border-primary/40 group-hover:shadow-[0_20px_40px_-12px_rgba(5,150,105,0.15)]">
                <Image
                  src={cat.image || fallbackImage}
                  alt={cat.name}
                  fill
                  sizes="(max-w-768px) 50vw, 20vw"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 dark:opacity-90"
                  priority
                />
                <div className="absolute inset-0 bg-black/[0.02] dark:bg-black/[0.15] transition-colors duration-300 group-hover:bg-transparent" />
              </div>

              <h3 className="text-xs font-bold text-muted-foreground group-hover:text-foreground mt-4 text-center transition-colors duration-200 tracking-tight leading-tight px-1 line-clamp-2 min-h-[2rem] flex items-center justify-center">
                {cat.name}
              </h3>

              {cat._count?.products ? (
                <span className="text-[10px] text-muted-foreground/60 font-medium mt-1">
                  {cat._count.products} products
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// PAGE EXPORT
// ==========================================

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={<CategoryGridIndexSkeleton />}
    >
      <InnerCategoryView />
    </Suspense>
  );
}