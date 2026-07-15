import { notFound } from "next/navigation";
import { getCategoryBySlugAction, getProductsByCategorySlugAction } from "@/actions/category";
import { CategoryDetailContent } from "./CategoryDetailContent";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export default async function CategorySlugPage({ params, searchParams }: PageProps) {
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