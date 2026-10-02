import Link from "next/link";
import { getNewArrivalsAction } from "@/actions/product";
import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { PaginatedProductGrid } from "@/components/marketplace/product-grid";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { ErrorState } from "@/components/marketplace/error-state";

export default async function NewArrivalsPage() {
  const result = await getNewArrivalsAction();
  return (
    <PageContainer className="py-6 sm:py-8">
      <div className="space-y-7">
        <PageHeader
          title="New arrivals"
          description="The latest products added by SmartDuka shops."
        />
        {!result.success ? (
          <ErrorState
            title="We couldn't load this discovery page"
            actions={
              <Link
                href="/products"
                className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground dark:text-white"
              >
                Browse products
              </Link>
            }
          />
        ) : result.data?.length ? (
          <PaginatedProductGrid products={result.data} />
        ) : (
          <IllustratedEmptyState
            illustration="/illustrations/empty-new-arrivals.svg"
            title="No new arrivals yet"
            description="Explore other products while you wait for something new."
            action={{ label: "Browse products", href: "/products" }}
            size="compact"
          />
        )}
      </div>
    </PageContainer>
  );
}
