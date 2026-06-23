"use client";

import Image from "next/image";
import Link from "next/link";
import { mockDatabase } from "@/data/mockDatabase";

export function CategoryBento() {
  const platformCategories = mockDatabase.categories;
  
  const fallbackImage = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80";

  return (
    <section className="w-full bg-card text-card-foreground rounded-[32px] p-5 sm:p-6 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:border-zinc-800/80 dark:shadow-none transition-colors duration-300">

      {/* RESPONSIVE BEN-TO MATRIX CELLS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-4 md:gap-6">
        {platformCategories.map((category) => {
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
              </div>
              
              <span className="text-xs font-bold text-muted-foreground mt-3 tracking-tight text-center px-1 truncate max-w-full transition-colors duration-200 group-hover:text-foreground select-none">
                {category.name.split(" & ")[0]}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}