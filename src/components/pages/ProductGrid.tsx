"use client";

import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { PaginatedProductGrid } from "@/components/marketplace/product-grid";
import type { MarketplaceProduct } from "@/components/marketplace/product-card";

type ProductItem = MarketplaceProduct & { createdAt?: string; discountPercentage?: number };
export function ProductGrid({ title, subtitle, products }: { title: string; subtitle: string; badge?: string; products: ProductItem[]; showArrivalBadge?: boolean; showDiscountBadge?: boolean }) {
  return <PageContainer className="py-6 sm:py-8 lg:py-10"><div className="space-y-8"><PageHeader title={title} description={subtitle} />{products.length ? <PaginatedProductGrid products={products} /> : <IllustratedEmptyState illustration="/illustrations/empty-products.svg" title="No products available yet" description="Products from SmartDuka shops will appear here." action={{ label: "Browse products", href: "/products" }} />}</div></PageContainer>;
}
