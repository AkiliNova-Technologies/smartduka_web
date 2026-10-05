/**
 * Small, client-safe shop contract shared by marketplace cards and featured
 * shops. Keep this separate from storefront detail and vendor settings data.
 */
export type PublicShopListing = {
  id: string;
  storeName: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  city: string | null;
  country: string | null;
  isVerified: boolean;
  fulfillmentMethods: ("DELIVERY" | "PICKUP")[];
  deliveryFee: number | null;
  deliveryEstimate: string | null;
  productCount: number;
};

type PublicShopListingRecord = {
  id: string;
  storeName: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  city: string | null;
  country: string | null;
  verificationStatus?: string;
  /** Backward-compatible input only; public queries select verificationStatus. */
  isVerified?: boolean;
  fulfillmentMethods: readonly unknown[];
  deliveryFee: { toString(): string } | number | null;
  deliveryEstimate: string | null;
  _count: { products: number };
};

/** Converts the public Prisma projection into the only shop-card DTO. */
export function serializePublicShopListing(
  vendor: PublicShopListingRecord,
): PublicShopListing {
  return {
    id: vendor.id,
    storeName: vendor.storeName,
    slug: vendor.slug,
    logoUrl: vendor.logoUrl,
    bannerUrl: vendor.bannerUrl,
    description: vendor.description,
    city: vendor.city,
    country: vendor.country,
    isVerified: vendor.verificationStatus === "VERIFIED" || (vendor.verificationStatus == null && vendor.isVerified === true),
    fulfillmentMethods: vendor.fulfillmentMethods.filter(
      (method): method is "DELIVERY" | "PICKUP" =>
        method === "DELIVERY" || method === "PICKUP",
    ),
    deliveryFee:
      vendor.deliveryFee == null ? null : Number(vendor.deliveryFee),
    deliveryEstimate: vendor.deliveryEstimate,
    productCount: vendor._count.products,
  };
}
