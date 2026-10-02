import { ProductCard } from "@/components/marketplace/product-card";
import { VendorCard } from "@/components/marketplace/vendor-card";
import { selectFeaturedShops } from "@/components/home/discovery-selection";
import type { FeaturedProductDto, FeaturedShopDto } from "@/lib/marketing-client";

export function FeaturedProductsSection({ products }: { products: FeaturedProductDto[] }) {
  return products.length ? <section className="space-y-4"><div><h2 className="text-2xl font-semibold">Featured products</h2><p className="text-sm text-muted-foreground">Curated picks from active SmartDuka shops.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></section> : null;
}
export function FeaturedShopsSection({ shops: featuredShops }: { shops: FeaturedShopDto[] }) {
  const shops = selectFeaturedShops(featuredShops);
  return shops.length ? <section className="space-y-4"><div><h2 className="text-2xl font-semibold">Featured shops</h2><p className="text-sm text-muted-foreground">Discover intentionally selected local businesses.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{shops.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}</div></section> : null;
}
