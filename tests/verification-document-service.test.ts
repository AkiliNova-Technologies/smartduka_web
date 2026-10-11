import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(), vendor: vi.fn(),
  documentFindFirst: vi.fn(), documentFindUnique: vi.fn(), vendorDocumentFindFirst: vi.fn(), vendorDocumentFindUnique: vi.fn(),
  vendorApplicationFindUnique: vi.fn(),
  auditCreate: vi.fn(), download: vi.fn(),
}));

vi.mock("@/lib/auth/admin-context", () => ({ requireAdminContext: mocks.admin }));
vi.mock("@/lib/auth/vendor-context", () => ({ requireVendorContext: mocks.vendor }));
vi.mock("@/lib/prisma/client", () => ({ prisma: {
  document: { findFirst: mocks.documentFindFirst, findUnique: mocks.documentFindUnique },
  vendorDocument: { findFirst: mocks.vendorDocumentFindFirst, findUnique: mocks.vendorDocumentFindUnique },
  vendorApplication: { findUnique: mocks.vendorApplicationFindUnique },
  auditLog: { create: mocks.auditCreate },
} }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: () => ({ storage: { from: () => ({ download: mocks.download }) } }) }));

import { VerificationDocumentService } from "@/services/verification-documents";

const document = { id: "doc-1", type: "NATIONAL_ID", name: "id.pdf", url: "storage://kyc-documents/kyc/shop-1/550e8400-e29b-41d4-a716-446655440000.pdf", mimeType: "application/pdf", size: 10, createdAt: new Date() };

describe("verification document authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.admin.mockResolvedValue({ userId: "admin-1", platformRole: "ADMIN" });
    mocks.vendor.mockResolvedValue({ user: { id: "vendor-user", vendorRole: "OWNER" }, vendor: { id: "shop-1" }, vendorId: "shop-1", vendorRole: "OWNER" });
  });

  it("scopes vendor document retrieval to the authenticated shop", async () => {
    mocks.documentFindFirst.mockResolvedValue(document);
    await expect(VerificationDocumentService.resolveForVendor("profile", "doc-1")).resolves.toMatchObject({ record: { id: "doc-1" } });
    expect(mocks.documentFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "doc-1", vendorId: "shop-1" } }));
    expect(mocks.vendor).toHaveBeenCalledWith("vendor:manage_legal", { allowInactiveShop: true });
  });

  it("does not reveal a document belonging to another shop", async () => {
    mocks.documentFindFirst.mockResolvedValue(null);
    await expect(VerificationDocumentService.resolveForVendor("profile", "doc-other")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("requires verification-admin authority and audits access", async () => {
    mocks.documentFindUnique.mockResolvedValue({ ...document, vendorId: "shop-1" });
    await VerificationDocumentService.resolveForAdmin("profile", "doc-1");
    expect(mocks.admin).toHaveBeenCalledWith("platform:manage_verifications");
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ vendorId: "shop-1", userId: "admin-1", action: "VERIFICATION_DOCUMENT_ACCESSED", entityId: "doc-1" }) });
  });

  it("rejects legacy or client-forged storage references", async () => {
    mocks.documentFindUnique.mockResolvedValue({ ...document, vendorId: "shop-1", url: "https://example.invalid/private.pdf" });
    await expect(VerificationDocumentService.resolveForAdmin("profile", "doc-1")).rejects.toMatchObject({ code: "INVALID_REFERENCE" });
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("returns the same unique underlying documents counted by the admin table", async () => {
    mocks.vendorApplicationFindUnique.mockResolvedValue({
      id: "onboarding-1",
      documents: [
        { ...document, id: "onboarding-doc", status: "APPROVED" },
        { ...document, id: "onboarding-doc", status: "APPROVED" },
      ],
      vendorProfile: {
        id: "shop-1",
        verificationStatus: "PENDING",
        verifiedAt: null,
        documents: [
          { ...document, id: "profile-doc" },
          { ...document, id: "profile-doc" },
        ],
        verificationApplications: [{
          id: "verification-1",
          publicId: "VFY-1",
          status: "PENDING",
          submittedAt: new Date(),
          reviewStartedAt: null,
          decidedAt: null,
          rejectionReason: null,
          decisionBy: null,
          documents: [
            { documentId: "profile-doc", vendorDocumentId: null },
            { documentId: null, vendorDocumentId: "onboarding-doc" },
          ],
        }],
      },
    });

    const result = await VerificationDocumentService.getAdminVendorDetails("onboarding-1");

    expect(result.documents.map(({ source, id }) => `${source}:${id}`).sort()).toEqual([
      "onboarding:onboarding-doc",
      "profile:profile-doc",
    ]);
    expect(result.applications[0].documentCount).toBe(2);
  });
});
