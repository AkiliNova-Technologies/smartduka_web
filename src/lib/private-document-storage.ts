import { STORAGE_BUCKETS } from "@/lib/supabase/storage-contract";

export type PrivateDocumentReference = { bucket: typeof STORAGE_BUCKETS.KYC_DOCUMENTS; path: string };

/** Accept only canonical private KYC object references owned by this shop. */
export function parsePrivateDocumentReference(value: string, vendorId: string): PrivateDocumentReference | null {
  const prefix = `storage://${STORAGE_BUCKETS.KYC_DOCUMENTS}/`;
  if (!value.startsWith(prefix)) return null;
  const path = value.slice(prefix.length);
  if (!path.startsWith(`kyc/${vendorId}/`) || path.includes("..") || path.includes("\\") || path.includes("//")) return null;
  if (!/^kyc\/[A-Za-z0-9_-]+\/[A-Za-z0-9-]+\.(?:jpg|png|webp|pdf)$/.test(path)) return null;
  return { bucket: STORAGE_BUCKETS.KYC_DOCUMENTS, path };
}
