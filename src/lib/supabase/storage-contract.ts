/** Canonical, audited SmartDuka Storage buckets. */
export const STORAGE_BUCKETS = {
  MARKETPLACE_MEDIA: "marketplace-media",
  KYC_DOCUMENTS: "kyc-documents",
} as const;

export type StorageUploadPurpose = "product-image" | "review-image" | "category-image" | "shop-media" | "marketing-artwork" | "kyc-document";

export const PUBLIC_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const KYC_MIME_TYPES = [...PUBLIC_IMAGE_MIME_TYPES, "application/pdf"] as const;

export const STORAGE_UPLOAD_RULES: Record<StorageUploadPurpose, { bucket: string; maxBytes: number; mimeTypes: readonly string[]; isPublic: boolean }> = {
  "product-image": { bucket: STORAGE_BUCKETS.MARKETPLACE_MEDIA, maxBytes: 5 * 1024 * 1024, mimeTypes: PUBLIC_IMAGE_MIME_TYPES, isPublic: true },
  "review-image": { bucket: STORAGE_BUCKETS.MARKETPLACE_MEDIA, maxBytes: 5 * 1024 * 1024, mimeTypes: PUBLIC_IMAGE_MIME_TYPES, isPublic: true },
  "category-image": { bucket: STORAGE_BUCKETS.MARKETPLACE_MEDIA, maxBytes: 5 * 1024 * 1024, mimeTypes: PUBLIC_IMAGE_MIME_TYPES, isPublic: true },
  "shop-media": { bucket: STORAGE_BUCKETS.MARKETPLACE_MEDIA, maxBytes: 5 * 1024 * 1024, mimeTypes: PUBLIC_IMAGE_MIME_TYPES, isPublic: true },
  "marketing-artwork": { bucket: STORAGE_BUCKETS.MARKETPLACE_MEDIA, maxBytes: 5 * 1024 * 1024, mimeTypes: PUBLIC_IMAGE_MIME_TYPES, isPublic: true },
  "kyc-document": { bucket: STORAGE_BUCKETS.KYC_DOCUMENTS, maxBytes: 10 * 1024 * 1024, mimeTypes: KYC_MIME_TYPES, isPublic: false },
};

/** Legacy UI compatibility: maps known old props; arbitrary buckets are rejected. */
export function legacyUploadPurpose(bucket?: string, folder?: string): StorageUploadPurpose | null {
  if (bucket === "vendor-docs" || /kyc|document/i.test(folder ?? "")) return "kyc-document";
  if (/marketing/i.test(folder ?? "")) return "marketing-artwork";
  if (/product/i.test(folder ?? "")) return "product-image";
  if (/vendor|shop|branding/i.test(folder ?? "")) return "shop-media";
  if (bucket === "marketplace-images" || bucket === "vendor-assets" || /categor/i.test(folder ?? "")) return "category-image";
  return null;
}
