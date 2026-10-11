import Link from "next/link";
import { SectionHeader } from "@/components/marketplace/section-header";
import { CategoryCard } from "@/components/marketplace/category-card";
import type { HomepageCategory } from "@/services/category";
import { selectHomepageCategories } from "@/components/home/discovery-selection";

// TODO: We could make the categories scrollable horizontally, implement the best design for this, and add a "View all" link to the categories page. For now, we just show a grid of categories.

export function HomeDiscovery({
  categories,
}: {
  categories: HomepageCategory[];
}) {
  const discoveredCategories = selectHomepageCategories(categories);
  if (!discoveredCategories.length) return null;

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Explore categories"
        description="Start with the products you need."
        action={
          <Link
            href="/categories"
            className="text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-5">
        {discoveredCategories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            variant="compact"
            className="w-full"
          />
        ))}
      </div>
    </section>
  );
}
