import { ProductCard } from "@/components/marketplace/product-card";
import { FeaturedShopsCarousel } from "@/components/marketing/featured-shops-carousel";
import { selectFeaturedShops } from "@/components/home/discovery-selection";
import type { FeaturedProductDto, FeaturedShopDto } from "@/lib/marketing-client";

export function FeaturedProductsSection({ products }: { products: FeaturedProductDto[] }) {
  return products.length ? <section id="featured-products" className="space-y-4"><div><h2 className="text-2xl font-semibold">Featured products</h2><p className="text-sm text-muted-foreground">Sponsored placements and curated picks from active Mwezora shops.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <div key={product.id} className="relative">{product.sponsored&&<span className="absolute left-2 top-2 z-10 rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow">Sponsored</span>}<ProductCard product={product} /></div>)}</div></section> : null;
}
export function FeaturedShopsSection({ shops: featuredShops }: { shops: FeaturedShopDto[] }) {
  const shops = selectFeaturedShops(featuredShops);
  return shops.length ? <section id="featured-shops" className="space-y-4"><div><h2 className="text-2xl font-semibold">Featured shops</h2><p className="text-sm text-muted-foreground">Sponsored placements and intentionally selected local businesses.</p></div><FeaturedShopsCarousel shops={shops} /></section> : null;
}
