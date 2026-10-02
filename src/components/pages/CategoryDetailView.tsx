"use client";

import { useCategories } from "@/hooks/use-categories";
import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { ErrorState } from "@/components/marketplace/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryCard } from "@/components/marketplace/category-card";

export default function CategoriesPage() {
  const { categories, isLoading, error, refresh } = useCategories();
  if (isLoading)
    return (
      <PageContainer className="py-8">
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  return (
    <PageContainer className="py-6 sm:py-8">
      <div className="space-y-7">
        <PageHeader
          title="Shop by category"
          description="Browse products from local shops by category."
        />
        {error ? (
          <ErrorState
            title="We couldn't load categories"
            actions={
              <button
                onClick={refresh}
                className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                Try again
              </button>
            }
          />
        ) : categories.length === 0 ? (
          <IllustratedEmptyState
            illustration="/illustrations/empty-categories.svg"
            title="No categories yet"
            description="Browse all products while the marketplace is being organised."
            action={{ label: "Browse products", href: "/products" }}
            size="standard"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {categories.map((category) => <CategoryCard key={category.id} category={category} />)}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
