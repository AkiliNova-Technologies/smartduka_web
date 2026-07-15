import { notFound } from "next/navigation";
import { getPublicProductAction } from "@/actions/product";
import { ProductDetailContent } from "./ProductDetailContent";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPublicProductAction(slug);
  if (!result.success || !result.data) notFound();
  return <ProductDetailContent product={result.data.product} relatedProducts={result.data.relatedProducts} />;
}