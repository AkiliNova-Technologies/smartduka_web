"use client";

import { legacyUploadPurpose, STORAGE_UPLOAD_RULES, type StorageUploadPurpose } from "./storage-contract";

interface UploadImageOptions { file: File; bucket?: string; folder?: string; maxSizeInMB?: number; purpose?: StorageUploadPurpose; }
interface UploadImageResult { success: boolean; url?: string; path?: string; error?: string; }

/** Client-side convenience only: authorization and Storage writes occur on the server. */
export async function uploadImageToSupabase(options: UploadImageOptions): Promise<UploadImageResult> {
  const purpose = options.purpose ?? legacyUploadPurpose(options.bucket, options.folder);
  if (!purpose) return { success: false, error: "Unknown upload destination." };
  const rule = STORAGE_UPLOAD_RULES[purpose];
  if (!rule.mimeTypes.includes(options.file.type)) return { success: false, error: "Unsupported file type." };
  if (options.file.size > rule.maxBytes) return { success: false, error: "File is too large." };
  const form = new FormData(); form.set("purpose", purpose); form.set("file", options.file);
  try {
    const response = await fetch("/api/storage/upload", { method: "POST", body: form });
    const result = await response.json() as { url?: string; path?: string; error?: string };
    return response.ok && result.url ? { success: true, url: result.url, path: result.path } : { success: false, error: result.error ?? "Upload failed." };
  } catch { return { success: false, error: "Upload failed." }; }
}
