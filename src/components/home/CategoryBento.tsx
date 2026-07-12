"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCategories } from "@/hooks/use-categories";
import { CategoryTree } from "@/types/marketplace";

export function CategoryBento() {
  const { categories, isLoading, error } = useCategories({ mode: "tree" });
  const categoryTree = categories as CategoryTree[];
  
  const fallbackImage = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80";

  // Loading state
  if (isLoading) {
    return (
      <section className="w-full hidden bg-card text-card-foreground rounded-[32px] p-5 sm:p-6 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:border-zinc-800/80 dark:shadow-none transition-colors duration-300">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-xs font-medium text-muted-foreground">Loading categories...</span>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return null;
  }

  // Only show if we have 5-6 main categories (no parentId)
  const mainCategories = categoryTree.filter(cat => !cat.parentId);
  
  if (mainCategories.length < 5 || mainCategories.length > 6) {
    return null;
  }

  return (
    <section className="w-full bg-card text-card-foreground rounded-[32px] p-5 sm:p-6 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:border-zinc-800/80 dark:shadow-none transition-colors duration-300">
      {/* RESPONSIVE BENTO MATRIX CELLS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-4 md:gap-6">
        {mainCategories.map((category) => {
          const productCount = category._count?.products || 0;
          
          return (
            <Link
              key={category.id}
              href={`/categories?slug=${category.slug}`}
              className="flex flex-col items-center group cursor-pointer transition-all duration-300 w-full outline-none"
            >
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted border border-border/40 overflow-hidden shadow-2xs transition-all duration-500 ease-out group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-[0_12px_24px_-8px_rgba(5,150,105,0.15)]">
                <Image
                  src={category.image || fallbackImage}
                  alt={`${category.name} Catalog Image`}
                  fill
                  sizes="(max-w-768px) 33vw, 15vw"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 dark:opacity-90"
                />
                <div className="absolute inset-0 bg-black/[0.02] dark:bg-black/[0.1] transition-colors group-hover:bg-transparent" />
                
                {/* Product count badge */}
                {productCount > 0 && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm">
                    {productCount > 99 ? '99+' : productCount}
                  </div>
                )}
              </div>
              
              <span className="text-xs font-bold text-muted-foreground mt-3 tracking-tight text-center px-1 truncate max-w-full transition-colors duration-200 group-hover:text-foreground select-none">
                {category.name.split(" & ")[0]}
              </span>
              
              {/* Subcategory count */}
              {category.subCategories && category.subCategories.length > 0 && (
                <span className="text-[10px] text-muted-foreground/60 font-medium mt-0.5">
                  {category.subCategories.length} subcategories
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}