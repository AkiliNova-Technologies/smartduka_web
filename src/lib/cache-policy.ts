/** Shared cache policy for data that is safe to reuse across navigations. */
export const cacheProfiles = {
  marketplace: { stale: 300, revalidate: 300, expire: 86_400 },
  promotions: { stale: 300, revalidate: 600, expire: 86_400 },
  vendorOperational: { stale: 30, revalidate: 30, expire: 300 },
} as const;

export const cacheTags = {
  marketplace: {
    products: "marketplace:products",
    categories: "marketplace:categories",
    shops: "marketplace:shops",
    discovery: "marketplace:discovery",
    promotions: "marketplace:promotions",
    promotionPlacement: (placement: string) => `marketplace:promotions:${placement}`,
  },
  product: (id: string) => `marketplace:product:${id}`,
  productSlug: (slug: string) => `marketplace:product:slug:${slug}`,
  shop: (id: string) => `marketplace:shop:${id}`,
  shopSlug: (slug: string) => `marketplace:shop:slug:${slug}`,
  vendorOrders: (vendorId: string) => `vendor:orders:${vendorId}`,
  vendorReviews: (vendorId: string) => `vendor:reviews:${vendorId}`,
  vendorEarnings: (vendorId: string) => `vendor:earnings:${vendorId}`,
};
