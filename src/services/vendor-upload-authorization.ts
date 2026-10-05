import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export class VendorUploadAuthorizationService {
  static async authorize(vendorId: string, input: { purpose: "PRODUCT_IMAGE" | "SHOP_LOGO" | "SHOP_BANNER"; mimeType: "image/jpeg" | "image/png" | "image/webp" }) {
    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[input.mimeType];
    const folder = input.purpose === "PRODUCT_IMAGE" ? `products/${vendorId}/draft` : `shops/${vendorId}`;
    const path = `${folder}/${randomUUID()}.${extension}`;
    const signed = await getSupabaseServerClient().storage.from("marketplace-media").createSignedUploadUrl(path);
    if (signed.error) throw signed.error;
    return { assetRef: `storage://marketplace-media/${path}`, path, token: signed.data.token, uploadUrl: signed.data.signedUrl, method: "PUT", expiresIn: 60 };
  }
}
