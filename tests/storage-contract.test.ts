import { describe, expect, it } from "vitest";
import { STORAGE_BUCKETS, STORAGE_UPLOAD_RULES, legacyUploadPurpose } from "@/lib/supabase/storage-contract";

describe("SmartDuka Storage contract", () => {
  it("has exactly one public media bucket and one private KYC bucket", () => {
    expect(STORAGE_BUCKETS).toEqual({ MARKETPLACE_MEDIA: "marketplace-media", KYC_DOCUMENTS: "kyc-documents" });
    expect(STORAGE_UPLOAD_RULES["kyc-document"].isPublic).toBe(false);
    expect(STORAGE_UPLOAD_RULES["product-image"].isPublic).toBe(true);
  });

  it("restricts MIME types and routes legacy destinations without arbitrary buckets", () => {
    expect(STORAGE_UPLOAD_RULES["kyc-document"].mimeTypes).toContain("application/pdf");
    expect(STORAGE_UPLOAD_RULES["product-image"].mimeTypes).not.toContain("application/pdf");
    expect(legacyUploadPurpose("marketplace-images", "categories")).toBe("category-image");
    expect(legacyUploadPurpose("attacker-bucket", "anything")).toBeNull();
  });
});
