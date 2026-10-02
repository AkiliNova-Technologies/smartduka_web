import Link from "next/link";
import { getDealsAction } from "@/actions/product";
import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { PaginatedProductGrid } from "@/components/marketplace/product-grid";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { ErrorState } from "@/components/marketplace/error-state";

export default async function DealsPage() {
  const result = await getDealsAction();
  return (
    <PageContainer className="py-6 sm:py-8">
      <div className="space-y-7">
        <PageHeader
          title="Current offers"
          description="Reduced prices from SmartDuka shops."
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
            illustration="/illustrations/empty-deals.svg"
            title="No deals right now"
            description="Check back later for current offers from SmartDuka shops."
            action={{ label: "Browse products", href: "/products" }}
            size="standard"
          />
        )}
      </div>
    </PageContainer>
  );
}
