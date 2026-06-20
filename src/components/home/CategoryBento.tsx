"use client";

import { 
  Shirt, 
  Sparkles, 
  Smartphone, 
  Sofa, 
  Dumbbell, 
  Zap, 
  Glasses, 
  ChefHat,
  LayoutGrid
} from "lucide-react";
import Link from "next/link";
import { mockDatabase } from "@/data/mockDatabase";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles: Sparkles,
  Zap: Zap,
  Glasses: Glasses,
  ChefHat: ChefHat,
  Shirt: Shirt,
  Sofa: Sofa,
  Smartphone: Smartphone,
  Dumbbell: Dumbbell,
};

export function CategoryBento() {
  const platformCategories = mockDatabase.categories;

  return (
    <section className="w-full bg-card text-card-foreground rounded-[28px] p-5 md:p-6 border border-border/60 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none transition-colors duration-300">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-y-6 gap-x-4 md:gap-6">
        {platformCategories.map((category) => {
          const IconComponent = ICON_MAP[category.icon] || LayoutGrid;

          return (
            <Link
              key={category.id}
              href={`/categories?slug=${category.slug}`}
              className="flex flex-col items-center group cursor-pointer transition-all duration-300"
            >
              {/* Minimalist Circular Icon Canvas Wrapper — Switches to core primary signature on hover */}
              <div className="w-16 h-16 bg-muted/50 border border-border rounded-[24px] flex items-center justify-center transition-all duration-300 ease-out group-hover:bg-primary group-hover:border-primary group-hover:shadow-[0_16px_24px_-8px_rgba(5,150,105,0.25)] dark:group-hover:shadow-none">
                <IconComponent className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-white dark:group-hover:text-zinc-900 transition-colors duration-300 ease-out" />
              </div>
              
              {/* Clean Premium Interface Label Spacing */}
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-3 tracking-tight text-center px-1 truncate max-w-full transition-colors duration-200 group-hover:text-foreground">
                {category.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}