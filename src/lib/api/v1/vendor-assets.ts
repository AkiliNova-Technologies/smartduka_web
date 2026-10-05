import "server-only";

const bucket = "marketplace-media";

export function resolveVendorAssetRef(assetRef: string, vendorId: string, purpose: "PRODUCT_IMAGE" | "SHOP_LOGO" | "SHOP_BANNER") {
  const prefix = purpose === "PRODUCT_IMAGE" ? `products/${vendorId}/draft/` : `shops/${vendorId}/`;
  const match = /^storage:\/\/([^/]+)\/(.+)$/.exec(assetRef);
  if (!match || match[1] !== bucket || !match[2].startsWith(prefix)) {
    const error = new Error("Asset reference is not authorized for this shop.");
    Object.assign(error, { code: "INVALID_ASSET_REFERENCE" });
    throw error;
  }
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) throw new Error("Storage public URL is not configured.");
  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${match[2]}`;
}
