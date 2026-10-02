import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCategoryBySlugAction, getProductsByCategorySlugAction } from "@/actions/category";
import { CategoryDetailContent } from "./CategoryDetailContent";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}

function CategoryDetailFallback() {
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8"><Skeleton className="h-8 w-56" /><Skeleton className="h-5 w-2/3" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="aspect-[.75] rounded-xl" />)}</div></main>;
}

export default function CategorySlugPage({ params, searchParams }: PageProps) {
  return <Suspense fallback={<CategoryDetailFallback />}><CategoryDetailRuntime params={params} searchParams={searchParams} /></Suspense>;
}

async function CategoryDetailRuntime({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { sort } = await searchParams;

  const [categoryResult, productsResult] = await Promise.all([
    getCategoryBySlugAction(slug),
    getProductsByCategorySlugAction(slug, sort),
  ]);

  if (!categoryResult.success || !categoryResult.data) notFound();

  const products = productsResult.success ? productsResult.data ?? [] : [];

  return (
    <CategoryDetailContent
      category={categoryResult.data}
      products={products}
    />
  );
}
