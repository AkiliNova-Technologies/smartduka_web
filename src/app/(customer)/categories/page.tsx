"use client";

import Image from "next/image";
import Link from "next/link";
import { mockDatabase } from "@/data/mockDatabase";

// Local asset map optimized for premium light and high-contrast dark environments
const CATEGORY_STYLE_MAP: Record<string, { image: string }> = {
  "cat-footwear-101": {
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
  },
  "cat-electronics-102": {
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80",
  },
  "cat-accessories-103": {
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600&q=80",
  },
  "cat-appliances-104": {
    image: "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&w=600&q=80",
  },
  "cat-apparel-105": {
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80",
  },
};

export default function CategoriesPage() {
  // Query categories dynamically straight from the centralized mock data backbone layer 
  const platformCategories = mockDatabase.categories;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 selection:bg-emerald-500/10 selection:text-emerald-700">
      
      {/* 1. Header Layout Section */}
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Shop by Categories
        </h1>
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-1">
          Explore curated collections from verified local dukas.
        </p>
      </div>

      {/* 2. Premium Responsive Row Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-x-6 gap-y-10 justify-items-center">
        {platformCategories.map((cat) => {
          // Read style assets and dynamic fallbacks seamlessly
          const styleAsset = CATEGORY_STYLE_MAP[cat.id] || {
            image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80",
          };

          return (
            <Link 
              key={cat.id} 
              href={`/categories?slug=${cat.slug}`}
              className="group flex flex-col items-center w-full max-w-[200px] outline-none"
            >
              {/* Fluid Circle Canvas Container adapting smoothly via semantic tokens across themes */}
              <div className="relative aspect-square w-full rounded-full bg-muted/40 dark:bg-zinc-900 overflow-hidden transition-all duration-500 ease-out border border-border/40 dark:border-zinc-800 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.02)] dark:shadow-none group-hover:shadow-[0_20px_40px_-12px_rgba(5,150,105,0.15)] dark:group-hover:border-primary/40 group-hover:-translate-y-1.5">
                
                {/* Inner protective shading rim ring */}
                <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.02] z-10 pointer-events-none" />
                
                <Image
                  src={styleAsset.image}
                  alt={cat.name}
                  fill
                  sizes="(max-w-768px) 50vw, (max-w-1200px) 25vw, 20vw"
                  className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105 dark:opacity-90 mix-blend-multiply dark:mix-blend-normal"
                />
              </div>

              {/* Typography Content Center Block */}
              <div className="mt-4 flex flex-col items-center text-center px-1 w-full">
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 line-clamp-2 group-hover:text-primary transition-colors duration-200 leading-tight min-h-[2.5rem] flex items-center justify-center w-full">
                  {cat.name}
                </h3>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}