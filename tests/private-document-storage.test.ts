import { describe, expect, it } from "vitest";
import { parsePrivateDocumentReference } from "@/lib/private-document-storage";

describe("private verification document references", () => {
  it("accepts only a canonical private object owned by the current shop", () => {
    expect(parsePrivateDocumentReference("storage://kyc-documents/kyc/shop-1/550e8400-e29b-41d4-a716-446655440000.pdf", "shop-1")).toEqual({
      bucket: "kyc-documents",
      path: "kyc/shop-1/550e8400-e29b-41d4-a716-446655440000.pdf",
    });
  });

  it.each([
    "storage://kyc-documents/kyc/shop-2/550e8400-e29b-41d4-a716-446655440000.pdf",
    "storage://marketplace-media/kyc/shop-1/550e8400-e29b-41d4-a716-446655440000.pdf",
    "storage://kyc-documents/kyc/shop-1/../shop-2/secret.pdf",
    "https://storage.example/kyc/shop-1/secret.pdf",
  ])("rejects cross-shop, traversal, public, or noncanonical references: %s", (reference) => {
    expect(parsePrivateDocumentReference(reference, "shop-1")).toBeNull();
  });
});
