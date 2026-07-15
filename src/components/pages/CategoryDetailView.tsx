"use client";

import {
  ShoppingBag
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCategories } from "@/hooks/use-categories";
import { CategoryTree } from "@/types/marketplace";
import { Skeleton } from "@/components/ui/skeleton";

// ==========================================
// SKELETON COMPONENTS
// ==========================================

function CategoryBubbleSkeleton() {
  return (
    <div className="flex flex-col items-center w-full max-w-[180px]">
      <Skeleton className="aspect-square w-full rounded-full" />
      <Skeleton className="w-20 h-3 rounded-full mt-4" />
      <Skeleton className="w-12 h-2.5 rounded-full mt-1" />
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
// CATEGORY GRID INDEX
// ==========================================

function CategoryGridIndex({
  categories,
  isLoading,
}: {
  categories: CategoryTree[];
  isLoading: boolean;
}) {
  const fallbackImage =
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80";

  if (isLoading) {
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
              href={`/categories/${cat.slug}`}
              className="group flex flex-col items-center w-full max-w-[180px] outline-none">
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

// Replace the entire InnerCategoryView + CategoriesPage export with:
export default function CategoriesPage() {
  const { categories, isLoading, error } = useCategories();
  const categoryTree = categories as CategoryTree[];

  if (isLoading) return <CategoryGridIndexSkeleton />;
  if (error) return null;

  return <CategoryGridIndex categories={categoryTree} isLoading={isLoading} />;
}
