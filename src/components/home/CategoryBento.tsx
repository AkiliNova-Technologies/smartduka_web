"use client";
import { useCategories } from "@/hooks/use-categories";
import { CategoryCard } from "@/components/marketplace/category-card";
import { Skeleton } from "@/components/ui/skeleton";
export function CategoryBento() {
  const { categories, isLoading, error } = useCategories();
  if (isLoading)
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="aspect-[4/3] rounded-xl" />
        ))}
      </div>
    );
  if (error || !categories.length) return null;
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {categories.slice(0, 5).map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </section>
  );
}
