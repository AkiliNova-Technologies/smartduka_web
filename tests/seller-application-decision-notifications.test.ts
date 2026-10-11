import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), applicationFind: vi.fn(), applicationUpdateMany: vi.fn(), applicationUpdate: vi.fn(),
  vendorUpsert: vi.fn(), vendorUpdateMany: vi.fn(), userUpdate: vi.fn(), auditCreate: vi.fn(), notificationCreate: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({ prisma: { $transaction: mocks.transaction } }));

import { ShopModerationService } from "@/services/shop-moderation";

const application = {
  id: "application-1", userId: "seller-1", status: "PENDING", storeName: "Seller One", storeSlug: "seller-one",
  businessEmail: "seller@example.test", businessPhone: "0700000000", website: null, streetAddress: "Plot 1", city: "Kampala",
  country: "Uganda", registrationNumber: null, vendorProfile: null,
};

describe("seller application decision notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applicationFind.mockResolvedValue(application);
    mocks.applicationUpdateMany.mockResolvedValue({ count: 1 });
    mocks.vendorUpsert.mockResolvedValue({ id: "shop-1", slug: "seller-one" });
    mocks.transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({
      vendorApplication: { findUnique: mocks.applicationFind, updateMany: mocks.applicationUpdateMany, update: mocks.applicationUpdate },
      vendorProfile: { upsert: mocks.vendorUpsert, updateMany: mocks.vendorUpdateMany },
      user: { update: mocks.userUpdate }, auditLog: { create: mocks.auditCreate }, notification: { create: mocks.notificationCreate },
    }));
  });

  it("creates the approval notification with a vendor-dashboard action", async () => {
    await ShopModerationService.transition({ applicationId: "application-1", action: "APPROVE", actorId: "admin-1" });
    expect(mocks.notificationCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      title: "Seller application approved",
      message: "Your seller application has been approved. You can now access your vendor dashboard and start managing your shop.",
      actionPath: "/vendor",
    }) });
  });

  it("creates the needs-attention notification and exposes the rejection reason", async () => {
    await ShopModerationService.transition({ applicationId: "application-1", action: "REJECT", reason: "Business address could not be verified", actorId: "admin-1" });
    expect(mocks.notificationCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      title: "Seller application needs attention",
      message: expect.stringContaining("Business address could not be verified"),
      actionPath: "/become-seller",
    }) });
  });
});
