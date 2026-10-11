import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findApplication: vi.fn(),
  findProfile: vi.fn(),
  createApplication: vi.fn(),
  createNotification: vi.fn(),
  createAudit: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

import { VendorService } from "@/services/vendor";

const input = {
  storeName: "Seller One",
  storeSlug: "seller-one",
  businessType: "Sole Proprietorship",
  businessEmail: "seller@example.test",
  businessPhone: "0700000000",
  streetAddress: "Plot 1",
  city: "Kampala",
  district: "Kampala",
  hasPhysicalStore: false,
  storeLocation: null,
};

describe("seller application lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findApplication.mockResolvedValue(null);
    mocks.findProfile.mockResolvedValue(null);
    mocks.createApplication.mockResolvedValue({ id: "application-1", status: "PENDING", createdAt: new Date(), ...input });
    mocks.transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({
      vendorApplication: { findUnique: mocks.findApplication, create: mocks.createApplication },
      vendorProfile: { findUnique: mocks.findProfile },
      notification: { create: mocks.createNotification },
      auditLog: { create: mocks.createAudit },
      user: { update: mocks.updateUser },
    }));
  });

  it("creates the submitted notification from the authoritative transaction", async () => {
    await VendorService.submitApplication("user-1", input);
    expect(mocks.createNotification).toHaveBeenCalledWith({ data: expect.objectContaining({
      userId: "user-1",
      title: "Seller application submitted",
      message: "Your seller application has been received and is currently under review. We will notify you when a decision is made.",
      actionPath: "/become-seller",
      idempotencyKey: "seller-application:application-1:submitted",
    }) });
    expect(mocks.createAudit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "SELLER_APPLICATION_SUBMITTED", entityId: "application-1" }) });
  });

  it("blocks a duplicate seller application before creating another record", async () => {
    mocks.findApplication.mockResolvedValue({ id: "active-application" });
    await expect(VendorService.submitApplication("user-1", input)).rejects.toThrow("DUPLICATE_APPLICATION");
    expect(mocks.createApplication).not.toHaveBeenCalled();
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });

  it("keeps a pending applicant in the customer role", async () => {
    await VendorService.submitApplication("user-1", input);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
