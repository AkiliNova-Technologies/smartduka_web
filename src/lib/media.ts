export const PRODUCT_IMAGE_FALLBACK = "/placeholders/product-image.svg";
export const SHOP_LOGO_FALLBACK = "/placeholders/shop-logo.svg";
export const SHOP_BANNER_FALLBACK = "/placeholders/shop-banner.svg";

export function mediaSource(source: string | null | undefined, fallback: string) {
  return source?.trim() || fallback;
}
