import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminContext: vi.fn(),
  getAllUsers: vi.fn(),
  updateUserRole: vi.fn(),
}));
vi.mock("@/lib/auth/admin-context", () => ({
  requireAdminContext: mocks.requireAdminContext,
}));
vi.mock("@/services/admin", () => ({
  AdminService: {
    getAllUsers: mocks.getAllUsers,
    updateUserRole: mocks.updateUserRole,
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getAllUsersAction, updateUserRoleAction } from "@/actions/admin";

describe("admin server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not expose administrative reads when the context denies customer-support access", async () => {
    mocks.requireAdminContext.mockRejectedValue(
      new Error("Administrative permission denied."),
    );
    await expect(getAllUsersAction()).resolves.toMatchObject({
      success: false,
    });
    expect(mocks.getAllUsers).not.toHaveBeenCalled();
  });

  it("uses the current SUPER_ADMIN context for role mutation rather than a caller actor ID", async () => {
    mocks.requireAdminContext.mockResolvedValue({
      userId: "super-db",
      platformRole: "SUPER_ADMIN",
    });
    mocks.updateUserRole.mockResolvedValue({
      id: "target",
      platformRole: "ADMIN",
    });
    await expect(
      updateUserRoleAction("target", "ADMIN"),
    ).resolves.toMatchObject({ success: true });
    expect(mocks.requireAdminContext).toHaveBeenCalledWith("platform:manage");
    expect(mocks.updateUserRole).toHaveBeenCalledWith(
      "target",
      "ADMIN",
      "super-db",
    );
  });
});
