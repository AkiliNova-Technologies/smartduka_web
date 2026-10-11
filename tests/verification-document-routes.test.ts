import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ resolveForAdmin: vi.fn(), resolveForVendor: vi.fn(), download: vi.fn() }));
vi.mock("@/services/verification-documents", () => ({
  VerificationDocumentError: class VerificationDocumentError extends Error { constructor(message: string, public code = "NOT_FOUND") { super(message); } },
  VerificationDocumentService: { resolveForAdmin: mocks.resolveForAdmin, resolveForVendor: mocks.resolveForVendor, download: mocks.download },
}));

import * as adminRoute from "@/app/api/admin/documents/[source]/[id]/route";
import * as vendorRoute from "@/app/api/vendor/documents/[source]/[id]/route";

describe("secure verification document routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects direct admin access when administrative authorization fails", async () => {
    mocks.resolveForAdmin.mockRejectedValue(new Error("Administrative permission denied."));
    const response = await adminRoute.GET(new Request("http://mwezora.test/api/admin/documents/profile/doc-1"), { params: Promise.resolve({ source: "profile", id: "doc-1" }) });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Administrative permission denied." });
  });

  it("rejects direct cross-vendor access without attempting storage retrieval", async () => {
    const notFound = new (await import("@/services/verification-documents")).VerificationDocumentError("Document not found.", "NOT_FOUND");
    mocks.resolveForVendor.mockRejectedValue(notFound);
    const response = await vendorRoute.GET(new Request("http://mwezora.test/api/vendor/documents/profile/doc-other"), { params: Promise.resolve({ source: "profile", id: "doc-other" }) });
    expect(response.status).toBe(404);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it("streams authorized files without exposing their private storage reference", async () => {
    mocks.resolveForAdmin.mockResolvedValue({ record: { name: "registration.pdf", mimeType: "application/pdf" }, reference: { bucket: "kyc-documents", path: "private-path" } });
    mocks.download.mockResolvedValue(new Blob(["document"], { type: "application/pdf" }));
    const response = await adminRoute.GET(new Request("http://mwezora.test/api/admin/documents/profile/doc-1?download=1"), { params: Promise.resolve({ source: "profile", id: "doc-1" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="registration.pdf"');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toBe("document");
  });
});
