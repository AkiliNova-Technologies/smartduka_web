import { getNewArrivalsAction } from "@/actions/product";
import { ProductGrid } from "@/components/pages/ProductGrid";

export default async function NewArrivalsPage() {
  const result = await getNewArrivalsAction();
  const products = result.success ? result.data ?? [] : [];

  return (
    <ProductGrid
      title="New Arrivals"
      subtitle="See the latest products and fresh stock uploaded by our dukas right now."
      products={products}
      showArrivalBadge
    />
  );
}