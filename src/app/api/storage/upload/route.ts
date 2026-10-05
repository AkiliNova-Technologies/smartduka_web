import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdminContext } from "@/lib/auth/admin-context";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { requireActiveUserId } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { STORAGE_UPLOAD_RULES, type StorageUploadPurpose } from "@/lib/supabase/storage-contract";

const PURPOSES = new Set<StorageUploadPurpose>(["product-image", "review-image", "category-image", "shop-media", "marketing-artwork", "kyc-document"]);
const extensionFor = (mime: string) => ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[mime]);

async function authorize(purpose: StorageUploadPurpose) {
  if (purpose === "category-image" || purpose === "marketing-artwork") { await requireAdminContext("platform:manage"); return "platform"; }
  if (purpose === "review-image") return requireActiveUserId();
  return (await requireVendorContext(purpose === "product-image" ? "vendor:manage_products" : purpose === "kyc-document" ? "vendor:manage_legal" : "vendor:manage_shop")).vendorId;
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData(), purpose = form.get("purpose"), file = form.get("file");
    if (typeof purpose !== "string" || !PURPOSES.has(purpose as StorageUploadPurpose) || !(file instanceof File)) return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
    const typedPurpose = purpose as StorageUploadPurpose, rule = STORAGE_UPLOAD_RULES[typedPurpose];
    if (!rule.mimeTypes.includes(file.type) || file.size > rule.maxBytes) return NextResponse.json({ error: "File type or size is not allowed for this upload." }, { status: 400 });
    const extension = extensionFor(file.type); if (!extension) return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    const owner = await authorize(typedPurpose), id = randomUUID();
    const path = typedPurpose === "product-image" ? `products/${owner}/draft/${id}.${extension}` : typedPurpose === "review-image" ? `reviews/${owner}/${id}.${extension}` : typedPurpose === "category-image" ? `categories/draft/${id}.${extension}` : typedPurpose === "shop-media" ? `shops/${owner}/${id}.${extension}` : typedPurpose === "marketing-artwork" ? `marketing/promotions/draft/${id}.${extension}` : `kyc/${owner}/${id}.${extension}`;
    const storage = getSupabaseServerClient(), { error } = await storage.storage.from(rule.bucket).upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
    if (error) throw error;
    return NextResponse.json({ url: rule.isPublic ? storage.storage.from(rule.bucket).getPublicUrl(path).data.publicUrl : `storage://${rule.bucket}/${path}`, path });
  } catch (error) { console.error("[storage upload]", error); return NextResponse.json({ error: "Upload failed." }, { status: 500 }); }
}
