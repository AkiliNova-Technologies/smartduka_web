"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { PaginatedProductGrid } from "@/components/marketplace/product-grid";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MarketplaceProduct } from "@/components/marketplace/product-card";
import { SubcategoryCarousel } from "@/components/marketplace/subcategory-carousel";

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent?: { name: string; slug: string } | null;
  subCategories: {
    id: string;
    name: string;
    slug: string;
    image?: string | null;
    _count: { products: number };
  }[];
  _count: { products: number; subCategories: number };
}
interface Props {
  category: CategoryData;
  products: MarketplaceProduct[];
}

export function CategoryDetailContent({ category, products }: Props) {
  const router = useRouter();
  return (
    <PageContainer className="py-6 sm:py-8">
      <div className="space-y-6">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Link href="/categories" className="hover:text-primary">
            Categories
          </Link>
          {category.parent ? (
            <>
              <span>/</span>
              <Link
                href={`/categories/${category.parent.slug}`}
                className="hover:text-primary"
              >
                {category.parent.name}
              </Link>
            </>
          ) : null}
          <span>/</span>
          <span aria-current="page" className="truncate text-foreground">
            {category.name}
          </span>
        </nav>
        <PageHeader
          title={category.name}
          description={
            category.description ||
            `${category._count.products} products in this category.`
          }
          actions={
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {products.length} products
              </span>
              <Select
                defaultValue="newest"
                onValueChange={(sort) =>
                  router.push(
                    `/categories/${category.slug}${sort === "newest" ? "" : `?sort=${sort}`}`,
                  )
                }
              >
                <SelectTrigger
                  aria-label="Sort products"
                  className="h-11 w-44 rounded-xl"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="low-high">Price: Low to High</SelectItem>
                  <SelectItem value="high-low">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
        {category.subCategories.length > 0 ? (
          <SubcategoryCarousel categories={category.subCategories} />
        ) : null}
        {products.length ? (
          <PaginatedProductGrid products={products} />
        ) : (
          <IllustratedEmptyState
            illustration="/illustrations/empty-products.svg"
            title="No products here yet"
            description="Try another category or browse all products."
            action={{ label: "Browse products", href: "/products" }}
            secondaryAction={{ label: "Browse categories", href: "/categories" }}
            size="compact"
          />
        )}
      </div>
    </PageContainer>
  );
}
