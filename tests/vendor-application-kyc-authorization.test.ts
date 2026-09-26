import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApplicantContext: vi.fn(),
  requireAdminContext: vi.fn(),
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  ApplicantAuthorizationError: class ApplicantAuthorizationError extends Error {},
  AdminAuthorizationError: class AdminAuthorizationError extends Error {},
  findApplication: vi.fn(),
  createApplication: vi.fn(),
  findProfile: vi.fn(),
  findVendor: vi.fn(),
  transaction: vi.fn(),
  getMyApplication: vi.fn(),
  getProfileByOwner: vi.fn(),
  updateApplicationStatus: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  AuthenticationRequiredError: mocks.AuthenticationRequiredError,
}));
vi.mock("@/lib/auth/applicant-context", () => ({
  ApplicantAuthorizationError: mocks.ApplicantAuthorizationError,
  requireApplicantContext: mocks.requireApplicantContext,
}));
vi.mock("@/lib/auth/admin-context", () => ({
  AdminAuthorizationError: mocks.AdminAuthorizationError,
  requireAdminContext: mocks.requireAdminContext,
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    vendorApplication: {
      findUnique: mocks.findApplication,
      create: mocks.createApplication,
    },
    vendorProfile: {
      findUnique: mocks.findProfile,
      findFirst: mocks.findVendor,
    },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/services/vendor", () => ({
  VendorService: {
    getMyApplication: mocks.getMyApplication,
    getVendorProfileByOwner: mocks.getProfileByOwner,
    updateApplicationStatus: mocks.updateApplicationStatus,
  },
}));

import * as applyRoute from "@/app/api/vendors/apply/route";
import * as verifyRoute from "@/app/api/vendors/[vendorId]/verify/route";
import * as adminReviewRoute from "@/app/api/admin/vendors/[id]/route";

const applicantA = { userId: "applicant-a" };
const req = (url: string, body?: unknown, method = "POST") =>
  new Request(url, {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe("vendor application and KYC authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApplicantContext.mockResolvedValue(applicantA);
  });

  it("returns 401 when an anonymous caller reads or submits an application", async () => {
    mocks.requireApplicantContext.mockRejectedValueOnce(
      new mocks.AuthenticationRequiredError("Unauthorized"),
    );
    expect((await applyRoute.GET()).status).toBe(401);
    mocks.requireApplicantContext.mockRejectedValueOnce(
      new mocks.AuthenticationRequiredError("Unauthorized"),
    );
    expect(
      (
        await applyRoute.POST(
          req("http://smartduka.test/api/vendors/apply", {
            storeName: "A",
          }) as never,
        )
      ).status,
    ).toBe(401);
  });

  it("uses only the current applicant for reads despite a forged userId query", async () => {
    mocks.getMyApplication.mockResolvedValue({ id: "application-a" });
    mocks.getProfileByOwner.mockResolvedValue(null);
    expect((await applyRoute.GET()).status).toBe(200);
    expect(mocks.getMyApplication).toHaveBeenCalledWith("applicant-a");
    expect(mocks.getProfileByOwner).toHaveBeenCalledWith("applicant-a");
  });

  it("creates an application for the derived applicant and ignores self-approval fields", async () => {
    mocks.findApplication.mockResolvedValue(null);
    mocks.findProfile.mockResolvedValue(null);
    mocks.createApplication.mockResolvedValue({
      id: "application-a",
      storeName: "Store A",
      status: "PENDING",
      createdAt: new Date(),
    });
    const response = await applyRoute.POST(
      req("http://smartduka.test/api/vendors/apply", {
        userId: "applicant-b",
        status: "APPROVED",
        reviewerNotes: "forged",
        reviewedBy: "admin-b",
        storeName: "Store A",
        storeSlug: "store-a",
        businessEmail: "a@example.test",
        businessPhone: "0700000000",
      }) as never,
    );
    expect(response.status).toBe(201);
    expect(mocks.createApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "applicant-a",
          storeName: "Store A",
        }),
      }),
    );
    const data = mocks.createApplication.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("reviewedBy");
    expect(data).not.toHaveProperty("reviewerNotes");
  });

  it("returns 404 when Applicant A tries associating KYC documents with Vendor B", async () => {
    mocks.findVendor.mockResolvedValue(null);
    const response = await verifyRoute.POST(
      req("http://smartduka.test/api/vendors/vendor-b/verify", {
        documents: { NATIONAL_ID: { name: "id", url: "secret" } },
      }) as never,
      { params: Promise.resolve({ vendorId: "vendor-b" }) },
    );
    expect(response.status).toBe(404);
    expect(mocks.findVendor).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "vendor-b", ownerId: "applicant-a" },
      }),
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("associates valid KYC only with the applicant-owned vendor application", async () => {
    mocks.findVendor.mockResolvedValue({
      id: "vendor-a",
      ownerId: "applicant-a",
      vendorApplication: { id: "application-a" },
    });
    const createDocument = vi.fn().mockResolvedValue({ id: "document-a" });
    const updateApplication = vi.fn();
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        vendorDocument: { create: createDocument },
        vendorApplication: { update: updateApplication },
      }),
    );
    const response = await verifyRoute.POST(
      req("http://smartduka.test/api/vendors/vendor-a/verify", {
        documents: {
          NATIONAL_ID: {
            name: "id",
            url: "url-a",
            size: 42,
            status: "APPROVED",
          },
        },
      }) as never,
      { params: Promise.resolve({ vendorId: "vendor-a" }) },
    );
    expect(response.status).toBe(200);
    expect(createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          applicationId: "application-a",
          status: "SUBMITTED",
        }),
      }),
    );
    expect(updateApplication).toHaveBeenCalledWith({
      where: { id: "application-a" },
      data: { status: "UNDER_REVIEW" },
    });
  });

  it("denies customer/vendor review attempts and uses the DB-derived admin reviewer for authorized review", async () => {
    mocks.requireAdminContext.mockRejectedValueOnce(
      new mocks.AdminAuthorizationError("Denied"),
    );
    expect(
      (
        await adminReviewRoute.PATCH(
          req(
            "http://smartduka.test/api/admin/vendors/application-a",
            { status: "APPROVED", adminUserId: "forged" },
            "PATCH",
          ) as never,
          { params: Promise.resolve({ id: "application-a" }) },
        )
      ).status,
    ).toBe(403);
    mocks.requireAdminContext.mockResolvedValueOnce({
      userId: "admin-a",
      platformRole: "ADMIN",
    });
    mocks.updateApplicationStatus.mockResolvedValue({ id: "application-a" });
    expect(
      (
        await adminReviewRoute.PATCH(
          req(
            "http://smartduka.test/api/admin/vendors/application-a",
            { status: "APPROVED", reviewerNotes: "ok", adminUserId: "forged" },
            "PATCH",
          ) as never,
          { params: Promise.resolve({ id: "application-a" }) },
        )
      ).status,
    ).toBe(200);
    expect(mocks.updateApplicationStatus).toHaveBeenCalledWith(
      "application-a",
      "APPROVED",
      "ok",
      "admin-a",
    );
  });
});
