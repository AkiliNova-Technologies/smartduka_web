import Link from "next/link";
import { Layers } from "lucide-react";
import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { EmptyState } from "@/components/marketplace/empty-state";

export default function CollectionDetailPage() {
  return (
    <PageContainer className="py-6 sm:py-8">
      <div className="space-y-7">
        <PageHeader
          title="Collection unavailable"
          description="SmartDuka does not currently publish data-backed collections."
        />
        <EmptyState
          icon={Layers}
          title="This collection is unavailable"
          description="Browse products or explore categories to find what you need."
          actions={
            <>
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                Browse products
              </Link>
              <Link
                href="/categories"
                className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold"
              >
                Explore categories
              </Link>
            </>
          }
        />
      </div>
    </PageContainer>
  );
}
