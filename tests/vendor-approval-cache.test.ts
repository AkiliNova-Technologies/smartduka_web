import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  admin: vi.fn(),
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/services/vendor", () => ({
  VendorService: { updateApplicationStatus: mocks.approve },
}));
vi.mock("@/lib/auth/admin-context", () => ({
  requireAdminContext: mocks.admin,
}));
vi.mock("next/cache", () => ({
  updateTag: mocks.updateTag,
  revalidatePath: mocks.revalidatePath,
}));

import { approveVendorApplication } from "@/actions/vendor";

describe("vendor approval cache invalidation", () => {
  it("publishes newly approved shops to the marketplace listing", async () => {
    mocks.admin.mockResolvedValue({ userId: "admin-1" });
    mocks.approve.mockResolvedValue({ id: "application-1" });

    await approveVendorApplication("application-1");

    expect(mocks.updateTag).toHaveBeenCalledWith("marketplace:shops");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/shops");
  });
});
