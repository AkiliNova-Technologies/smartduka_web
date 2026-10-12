"use client";

import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { getPersonalityMessage } from "@/lib/personality-messages";
import { useAppearance } from "@/providers/AppearanceProvider";

export function PersonalityProductEmpty({ search }: { search?: string }) {
  const { personality } = useAppearance();

  return (
    <IllustratedEmptyState
      illustration={search ? "/illustrations/empty-search.svg" : "/illustrations/empty-products.svg"}
      title={search ? "No products found" : getPersonalityMessage("discovery.empty.title", personality)}
      description={search ? `We couldn’t find anything matching “${search}”. Try another search or browse a category.` : getPersonalityMessage("discovery.empty.description", personality)}
      action={{ label: search ? "Clear search" : "Browse shops", href: search ? "/products" : "/shops" }}
      secondaryAction={search ? { label: "Browse categories", href: "/categories" } : undefined}
    />
  );
}
