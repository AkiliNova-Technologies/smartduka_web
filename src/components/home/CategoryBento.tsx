"use client";

import Image from "next/image";
import Link from "next/link";
import { useCategories } from "@/hooks/use-categories";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryTree } from "@/types/marketplace";

function CategoryBentoSkeleton() {
  return (
    <section className="w-full bg-card text-card-foreground rounded-[32px] p-5 sm:p-6 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:border-zinc-800/80 dark:shadow-none">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-4 md:gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center w-full">
            <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-md mt-3" />
            <Skeleton className="h-2.5 w-14 rounded-md mt-1" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function CategoryBento() {
  const { categories, isLoading, error } = useCategories();
  const categoryTree = categories as CategoryTree[];

  const fallbackImage =
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80";

  if (isLoading) {
    return <CategoryBentoSkeleton />;
  }

  if (error) {
    return null;
  }

  const mainCategories = categoryTree.filter((cat) => !cat.parentId);

  if (mainCategories.length < 5 || mainCategories.length > 6) {
    return null;
  }

  return (
    <section className="w-full bg-card text-card-foreground rounded-[32px] p-5 sm:p-6 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:border-zinc-800/80 dark:shadow-none transition-colors duration-300">
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
                  sizes="(max-width: 768px) 33vw, 15vw"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 dark:opacity-90"
                />
                <div className="absolute inset-0 bg-black/[0.02] dark:bg-black/[0.1] transition-colors group-hover:bg-transparent" />

                {productCount > 0 && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm">
                    {productCount > 99 ? "99+" : productCount}
                  </div>
                )}
              </div>

              <span className="text-xs font-bold text-muted-foreground mt-3 tracking-tight text-center px-1 truncate max-w-full transition-colors duration-200 group-hover:text-foreground select-none">
                {category.name.split(" & ")[0]}
              </span>

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