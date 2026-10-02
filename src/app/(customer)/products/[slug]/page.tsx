import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductService } from "@/services/product";
import { ProductDetailContent } from "./ProductDetailContent";
import { Skeleton } from "@/components/ui/skeleton";

type ProductDetailPageProps = { params: Promise<{ slug: string }> };

function ProductDetailFallback() {
  return <main className="mx-auto grid max-w-7xl gap-8 px-4 py-6 lg:grid-cols-2 sm:px-6"><Skeleton className="aspect-square rounded-xl" /><section className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-24 w-full" /></section></main>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  return <Suspense fallback={<ProductDetailFallback />}><ProductDetailRuntime params={params} /></Suspense>;
}

async function ProductDetailRuntime({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const result = await ProductService.getCachedPublicProductDetailBySlug(slug);
  if (!result) notFound();
  return (
    <ProductDetailContent
      product={result.product}
      relatedProducts={result.relatedProducts}
    />
  );
}
