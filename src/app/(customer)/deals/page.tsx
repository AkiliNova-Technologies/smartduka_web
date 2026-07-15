import { getDealsAction } from "@/actions/product";
import { ProductGrid } from "@/components/pages/ProductGrid";

export default async function DealsPage() {
  const result = await getDealsAction();
  const products = result.success ? result.data ?? [] : [];

  return (
    <ProductGrid
      title="Flash Sales & Limited Deals"
      subtitle="Live limited-time price drops from verified dukas updated hourly."
      products={products}
      showDiscountBadge
    />
  );
}