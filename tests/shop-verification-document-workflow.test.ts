import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  vendorContext: vi.fn(), adminContext: vi.fn(), vendorFind: vi.fn(), applicationFindUnique: vi.fn(), applicationCreate: vi.fn(), applicationUpdate: vi.fn(), submissionCreateMany: vi.fn(),
  vendorUpdate: vi.fn(), activityCreate: vi.fn(), notificationCreate: vi.fn(), notificationCreateMany: vi.fn(),
  auditCreate: vi.fn(), adminFindMany: vi.fn(), transaction: vi.fn(), revalidateTag: vi.fn(), revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/vendor-context", () => ({ requireVendorContext: mocks.vendorContext }));
vi.mock("@/lib/auth/admin-context", () => ({ requireAdminContext: mocks.adminContext }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag, revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma/client", () => ({ prisma: {
  vendorProfile: { findUnique: mocks.vendorFind, findUniqueOrThrow: mocks.vendorFind },
  shopVerificationApplication: { findFirst: vi.fn(), findUnique: mocks.applicationFindUnique },
  $transaction: mocks.transaction,
} }));

import { ShopVerificationService } from "@/services/shop-verifications";

const vendor = {
  id: "shop-1", ownerId: "owner-1", slug: "shop-one", status: "ACTIVE", storeName: "Shop One", email: "shop@example.com", phone: "+256700000001",
  description: "A complete shop profile", address: "Kampala", city: "Kampala", verificationApplications: [],
  vendorApplication: { storeName: "Shop One Ltd", businessType: "LIMITED", registrationNumber: "REG", taxId: "TIN", status: "APPROVED" },
};
const documents = {
  documents: [{ id: "doc-profile", type: "BUSINESS_REGISTRATION", name: "registration.pdf", mimeType: "application/pdf", size: 10, createdAt: new Date() }],
  vendorApplication: { documents: [{ id: "doc-onboarding", type: "NATIONAL_ID", name: "id.pdf", mimeType: "application/pdf", size: 10, createdAt: new Date(), status: "APPROVED" }] },
};

describe("shop verification document submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.vendorContext.mockResolvedValue({ user: { id: "owner-1" }, vendorId: "shop-1", vendor: { slug: "shop-one" } });
    mocks.adminContext.mockResolvedValue({ userId: "admin-1", platformRole: "ADMIN" });
    mocks.vendorFind.mockImplementation(({ select }: { select?: unknown }) => Promise.resolve(select ? documents : vendor));
    mocks.applicationCreate.mockResolvedValue({ id: "verification-1", publicId: "VFY-2026-ABC", vendorId: "shop-1" });
    mocks.adminFindMany.mockResolvedValue([{ id: "admin-1" }]);
    mocks.transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({
      shopVerificationApplication: { create: mocks.applicationCreate, update: mocks.applicationUpdate }, shopVerificationDocument: { createMany: mocks.submissionCreateMany },
      vendorProfile: { update: mocks.vendorUpdate }, shopVerificationActivity: { create: mocks.activityCreate },
      notification: { create: mocks.notificationCreate, createMany: mocks.notificationCreateMany }, auditLog: { create: mocks.auditCreate }, user: { findMany: mocks.adminFindMany },
    }));
  });

  it("reports missing required document categories before submission", async () => {
    mocks.vendorFind.mockImplementation(({ select }: { select?: unknown }) => Promise.resolve(select ? { documents: [], vendorApplication: { documents: [] } } : vendor));
    await expect(ShopVerificationService.checkEligibility()).resolves.toMatchObject({ eligible: false, missing: expect.arrayContaining(["BUSINESS_REGISTRATION", "IDENTITY_DOCUMENT"]) });
  });

  it("links existing documents, queues the case, audits it, and notifies administrators", async () => {
    const result = await ShopVerificationService.submit();
    expect(result).toMatchObject({ id: "verification-1" });
    expect(mocks.submissionCreateMany).toHaveBeenCalledWith({ data: expect.arrayContaining([
      { applicationId: "verification-1", documentId: "doc-profile" },
      { applicationId: "verification-1", vendorDocumentId: "doc-onboarding" },
    ]) });
    expect(mocks.vendorUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ verificationStatus: "PENDING" }) }));
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "SHOP_VERIFICATION_SUBMITTED", entityId: "verification-1" }) });
    expect(mocks.notificationCreateMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ userId: "admin-1", actionPath: "/admin/verifications/verification-1" })] });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/verifications");
  });

  it("requires a rejection reason and records the authoritative decision without changing operational status", async () => {
    mocks.applicationFindUnique.mockResolvedValue({ id: "verification-1", publicId: "VFY-2026-ABC", vendorId: "shop-1", status: "UNDER_REVIEW", reviewStartedAt: new Date(), vendor: { ownerId: "owner-1", slug: "shop-one" } });
    await expect(ShopVerificationService.transition("verification-1", "REJECTED")).rejects.toThrow("A clear reason is required");
    mocks.applicationUpdate.mockImplementation(({ data }: { data: object }) => ({ id: "verification-1", ...data }));
    await ShopVerificationService.transition("verification-1", "REJECTED", "Registration could not be verified");
    expect(mocks.applicationUpdate).toHaveBeenCalledWith({ where: { id: "verification-1" }, data: expect.objectContaining({ status: "REJECTED", decisionById: "admin-1", rejectionReason: "Registration could not be verified" }) });
    expect(mocks.vendorUpdate).toHaveBeenCalledWith({ where: { id: "shop-1" }, data: expect.not.objectContaining({ status: expect.anything() }) });
    expect(mocks.vendorUpdate).toHaveBeenCalledWith({ where: { id: "shop-1" }, data: expect.objectContaining({ verificationStatus: "REJECTED", isVerified: false }) });
  });

  it("approval updates the verified-badge authority and records reviewer and decision time", async () => {
    mocks.applicationFindUnique.mockResolvedValue({ id: "verification-1", publicId: "VFY-2026-ABC", vendorId: "shop-1", status: "UNDER_REVIEW", reviewStartedAt: new Date(), vendor: { ownerId: "owner-1", slug: "shop-one" } });
    mocks.applicationUpdate.mockImplementation(({ data }: { data: object }) => ({ id: "verification-1", ...data }));
    await ShopVerificationService.transition("verification-1", "VERIFIED");
    expect(mocks.applicationUpdate).toHaveBeenCalledWith({ where: { id: "verification-1" }, data: expect.objectContaining({ status: "VERIFIED", decisionById: "admin-1", decidedAt: expect.any(Date), verifiedAt: expect.any(Date) }) });
    expect(mocks.vendorUpdate).toHaveBeenCalledWith({ where: { id: "shop-1" }, data: expect.objectContaining({ verificationStatus: "VERIFIED", isVerified: true, verifiedAt: expect.any(Date) }) });
  });
});
