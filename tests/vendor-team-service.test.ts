import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
  count: vi.fn(),
  entitlement: vi.fn(),
}));

vi.mock("@/lib/auth/vendor-context", () => ({ requireVendorContext: mocks.context }));
vi.mock("@/lib/prisma/client", () => ({ prisma: {
  user: { findUnique: mocks.findUnique, findFirst: mocks.findFirst, update: mocks.update, count: mocks.count },
  auditLog: { create: mocks.audit },
  $transaction: mocks.transaction,
} }));
vi.mock("@/services/vendor-entitlement", () => ({ VendorEntitlementService: { summary: mocks.entitlement, staffSeatLimit: (summary: { status: string; activeSubscription?: { plan: { staffSeats: number } } | null }) => summary.status === "TRIAL" ? 10 : summary.status === "ACTIVE_SUBSCRIPTION" ? summary.activeSubscription?.plan.staffSeats ?? 0 : 0 } }));

import { VendorTeamError, VendorTeamService } from "@/services/vendor-team";

const ownerContext = { user: { id: "owner-a" }, vendorId: "vendor-a", vendorRole: "OWNER", vendor: { id: "vendor-a", ownerId: "owner-a", slug: "shop-a", status: "ACTIVE" } };
type VendorTeamTransaction = { user: { count: typeof mocks.count; update: typeof mocks.update }; auditLog: { create: typeof mocks.audit } };

describe("vendor team delegation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.mockResolvedValue(ownerContext);
    mocks.transaction.mockImplementation((callback: (tx: VendorTeamTransaction) => unknown) => callback({ user: { count: mocks.count, update: mocks.update }, auditLog: { create: mocks.audit } }));
    mocks.count.mockResolvedValue(0);
    mocks.entitlement.mockResolvedValue({ status: "TRIAL" });
    mocks.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({ id: "member-a", ...data }));
  });

  it("adds an active user to the owner’s server-derived vendor with an audit record", async () => {
    mocks.findUnique.mockResolvedValue({ id: "member-a", vendorId: null, vendorRole: null, status: "ACTIVE" });
    await expect(VendorTeamService.add("manager@example.com", "MANAGER")).resolves.toMatchObject({ vendorId: "vendor-a", vendorRole: "MANAGER" });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: { vendorId: "vendor-a", vendorRole: "MANAGER" } }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ vendorId: "vendor-a", action: "VENDOR_TEAM_MEMBER_ADDED" }) }));
  });

  it("rejects managers and users attached to another shop", async () => {
    mocks.context.mockResolvedValue({ ...ownerContext, user: { id: "manager-a" }, vendorRole: "MANAGER" });
    await expect(VendorTeamService.add("member@example.com", "STAFF")).rejects.toBeInstanceOf(VendorTeamError);

    mocks.context.mockResolvedValue(ownerContext);
    mocks.findUnique.mockResolvedValue({ id: "member-b", vendorId: "vendor-b", vendorRole: "MANAGER", status: "ACTIVE" });
    await expect(VendorTeamService.add("member@example.com", "STAFF")).rejects.toBeInstanceOf(VendorTeamError);
  });
});
