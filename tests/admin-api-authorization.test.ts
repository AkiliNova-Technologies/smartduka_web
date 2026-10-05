import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminContext: vi.fn(),
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  AdminAuthorizationError: class AdminAuthorizationError extends Error {},
  getAllUsers: vi.fn(),
  updateUserRole: vi.fn(),
  getAllApplications: vi.fn(),
  updateApplicationStatus: vi.fn(),
  requireRequestRuntime: vi.fn(),
}));
vi.mock("@/lib/next/request-runtime", () => ({ requireRequestRuntime: mocks.requireRequestRuntime }));
vi.mock("@/lib/auth/session", () => ({
  AuthenticationRequiredError: mocks.AuthenticationRequiredError,
}));
vi.mock("@/lib/auth/admin-context", () => ({
  AdminAuthorizationError: mocks.AdminAuthorizationError,
  requireAdminContext: mocks.requireAdminContext,
}));
vi.mock("@/services/admin", () => ({
  AdminService: {
    getAllUsers: mocks.getAllUsers,
    updateUserRole: mocks.updateUserRole,
  },
}));
vi.mock("@/services/vendor", () => ({
  VendorService: {
    getAllApplications: mocks.getAllApplications,
    updateApplicationStatus: mocks.updateApplicationStatus,
  },
}));

import * as usersRoute from "@/app/api/admin/users/route";
import * as userRoute from "@/app/api/admin/users/[id]/route";
import * as vendorsRoute from "@/app/api/admin/vendors/route";
import * as vendorRoute from "@/app/api/admin/vendors/[id]/route";

const request = (body?: unknown) =>
  new Request("http://smartduka.test/api/admin", {
    method: body === undefined ? "GET" : "PATCH",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe("admin API authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminContext.mockResolvedValue({
      userId: "admin-db",
      platformRole: "ADMIN",
    });
  });

  it("returns 401 without a valid session and 403 for authenticated non-admin access", async () => {
    mocks.requireAdminContext.mockRejectedValueOnce(
      new mocks.AuthenticationRequiredError("Unauthorized"),
    );
    expect((await vendorsRoute.GET(request() as never)).status).toBe(401);
    mocks.requireAdminContext.mockRejectedValueOnce(
      new mocks.AdminAuthorizationError("Denied"),
    );
    expect((await vendorsRoute.GET(request() as never)).status).toBe(403);
    expect(mocks.getAllApplications).not.toHaveBeenCalled();
  });

  it("allows the existing ADMIN vendor-management capability but scopes user list reads to customer support", async () => {
    mocks.getAllApplications.mockResolvedValue([]);
    mocks.getAllUsers.mockResolvedValue({ users: [], total: 0 });
    expect((await vendorsRoute.GET(request() as never)).status).toBe(200);
    expect(mocks.requireAdminContext).toHaveBeenCalledWith(
      "platform:manage_vendors",
    );
    expect(
      (
        await usersRoute.GET({
          nextUrl: new URL("http://smartduka.test/api/admin/users"),
        } as never)
      ).status,
    ).toBe(200);
    expect(mocks.requireAdminContext).toHaveBeenCalledWith(
      "platform:customer_support",
    );
  });

  it("requires platform:manage for user privilege changes and records the DB-derived actor", async () => {
    mocks.requireAdminContext.mockRejectedValueOnce(
      new mocks.AdminAuthorizationError("Denied"),
    );
    expect(
      (
        await userRoute.PATCH(
          request({
            platformRole: "SUPER_ADMIN",
            adminUserId: "forged-super",
          }) as never,
          { params: Promise.resolve({ id: "target" }) },
        )
      ).status,
    ).toBe(403);
    mocks.requireAdminContext.mockResolvedValueOnce({
      userId: "super-db",
      platformRole: "SUPER_ADMIN",
    });
    mocks.updateUserRole.mockResolvedValue({
      id: "target",
      platformRole: "ADMIN",
    });
    expect(
      (
        await userRoute.PATCH(
          request({
            platformRole: "ADMIN",
            adminUserId: "forged-admin",
          }) as never,
          { params: Promise.resolve({ id: "target" }) },
        )
      ).status,
    ).toBe(200);
    expect(mocks.updateUserRole).toHaveBeenCalledWith(
      "target",
      "ADMIN",
      "super-db",
    );
  });

  it("uses the DB-derived admin actor for vendor review, never the request body", async () => {
    mocks.updateApplicationStatus.mockResolvedValue({ id: "application" });
    const response = await vendorRoute.PATCH(
      request({
        status: "APPROVED",
        adminUserId: "forged-super",
        reviewerNotes: "ok",
      }) as never,
      { params: Promise.resolve({ id: "application" }) },
    );
    expect(response.status).toBe(200);
    expect(mocks.updateApplicationStatus).toHaveBeenCalledWith(
      "application",
      "APPROVED",
      "ok",
      "admin-db",
    );
  });
});
