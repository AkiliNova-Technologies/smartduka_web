import Link from "next/link";
import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";

export default function CollectionsPage() {
  return (
    <PageContainer className="py-6 sm:py-8">
      <div className="space-y-7">
        <PageHeader
          title="Collections"
          description="Curated collections will appear here when they are available from SmartDuka shops."
        />
        <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">Collections are not available yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Curated collections are not currently available on SmartDuka. Browse products or categories instead.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/products" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Browse products</Link><Link href="/categories" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold">Explore categories</Link></div>
        </div>
      </div>
    </PageContainer>
  );
}
