import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), vendorFindUnique: vi.fn(), auditCreate: vi.fn(), notificationCreate: vi.fn(), transaction: vi.fn(),
}));

vi.mock("@/lib/auth/vendor-context", () => ({ requireVendorContext: mocks.context, VendorAuthorizationError: class VendorAuthorizationError extends Error {} }));
vi.mock("@/lib/prisma/client", () => ({ prisma: {
  vendorPayoutAccount: { findUnique: mocks.findUnique, findFirst: mocks.findFirst, findMany: mocks.findMany, findUniqueOrThrow: mocks.findUniqueOrThrow, create: mocks.create, update: mocks.update, updateMany: mocks.updateMany },
  vendorProfile: { findUnique: mocks.vendorFindUnique }, auditLog: { create: mocks.auditCreate }, notification: { create: mocks.notificationCreate }, $transaction: mocks.transaction,
} }));

import { decryptPayoutReference } from "@/lib/vendor-payout-crypto";
import { VendorPayoutService } from "@/services/vendor-payout";

const context = { vendorId: "vendor-a", user: { id: "owner-a", vendorRole: "OWNER" } };
const input = { provider: "MTN_MOBILE_MONEY", accountHolderName: "Albert Watbin", mobileNumber: "0777000042" };
const account = { id: "account-a", type: "MOBILE_MONEY", provider: "MTN_MOBILE_MONEY", accountHolderName: "Albert Watbin", maskedReference: "+256 77••• ••42", status: "ACTIVE", isDefault: true, verifiedAt: null, createdAt: new Date(), updatedAt: new Date() };

beforeEach(() => {
  process.env.VENDOR_PAYOUT_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  vi.clearAllMocks();
  mocks.context.mockResolvedValue(context);
  mocks.findUnique.mockResolvedValue(null);
  mocks.findFirst.mockResolvedValue(null);
  mocks.create.mockImplementation(async ({ data }: { data: typeof account }) => ({ ...account, ...data }));
  mocks.update.mockImplementation(async ({ data }: { data: Partial<typeof account> }) => ({ ...account, ...data }));
  mocks.updateMany.mockResolvedValue({ count: 0 });
  mocks.vendorFindUnique.mockResolvedValue({ ownerId: "owner-a" });
  mocks.transaction.mockImplementation(async (callback: (tx: { vendorPayoutAccount: Record<string, unknown>; vendorProfile: Record<string, unknown>; auditLog: Record<string, unknown>; notification: Record<string, unknown> }) => Promise<unknown>) => callback({ vendorPayoutAccount: { findUnique: mocks.findUnique, findFirst: mocks.findFirst, findUniqueOrThrow: mocks.findUniqueOrThrow, create: mocks.create, update: mocks.update, updateMany: mocks.updateMany }, vendorProfile: { findUnique: mocks.vendorFindUnique }, auditLog: { create: mocks.auditCreate }, notification: { create: mocks.notificationCreate } }));
});

describe("VendorPayoutService", () => {
  it.each([undefined, Buffer.alloc(16).toString("base64")])("fails closed when the payout encryption key is invalid", (key) => {
    if (key) process.env.VENDOR_PAYOUT_ENCRYPTION_KEY = key;
    else delete process.env.VENDOR_PAYOUT_ENCRYPTION_KEY;
    expect(() => decryptPayoutReference("v1.bad.bad.bad")).toThrow("Payout destination storage is not configured.");
  });

  it("stores an encrypted reference while returning only a masked DTO", async () => {
    const result = await VendorPayoutService.addPayoutAccount(input);
    const saved = mocks.create.mock.calls[0][0].data;
    expect(decryptPayoutReference(saved.accountReferenceEncrypted)).toBe("+256777000042");
    expect(saved.accountReferenceEncrypted).not.toContain("0777000042");
    expect(JSON.stringify(result)).not.toContain("0777000042");
    expect(result).toMatchObject({ maskedReference: "+256 77••• ••42", isDefault: true, status: "ACTIVE" });
  });

  it("creates masked-only audit and owner notification records", async () => {
    await VendorPayoutService.addPayoutAccount(input);
    const audit = mocks.auditCreate.mock.calls[0][0].data;
    const notification = mocks.notificationCreate.mock.calls[0][0].data;
    expect(JSON.stringify(audit)).toContain("+256 77••• ••42");
    expect(JSON.stringify(audit)).not.toContain("0777000042");
    expect(notification).toMatchObject({ userId: "owner-a", actionPath: "/vendor/settings?tab=payouts" });
    expect(JSON.stringify(notification)).not.toContain("0777000042");
  });

  it("makes a replacement the sole default and retains the previous account as disabled history", async () => {
    mocks.findFirst.mockResolvedValueOnce({ id: "old", provider: "AIRTEL_MONEY", maskedReference: "+25675••• ••01" });
    await VendorPayoutService.addPayoutAccount(input);
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { vendorId: "vendor-a", isDefault: true }, data: expect.objectContaining({ isDefault: false, status: "DISABLED" }) }));
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "VENDOR_PAYOUT_DESTINATION_CHANGED", oldValues: { provider: "AIRTEL_MONEY", maskedReference: "+25675••• ••01" } }) }));
  });

  it("changes the default transactionally and disables the prior default", async () => {
    mocks.findFirst.mockResolvedValueOnce({ id: "account-b", provider: "AIRTEL_MONEY", maskedReference: "+256 75••• ••43", isDefault: false }).mockResolvedValueOnce({ provider: "MTN_MOBILE_MONEY", maskedReference: "+256 77••• ••42" });
    mocks.update.mockResolvedValue({ ...account, id: "account-b", provider: "AIRTEL_MONEY", isDefault: true, status: "ACTIVE" });
    await expect(VendorPayoutService.setDefaultPayoutAccount("account-b")).resolves.toMatchObject({ id: "account-b", isDefault: true });
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ isDefault: false, status: "DISABLED" }) }));
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "VENDOR_PAYOUT_DEFAULT_CHANGED" }) }));
  });

  it("will not disable the only active default account", async () => {
    mocks.findFirst.mockResolvedValue({ id: "account-a", provider: "MTN_MOBILE_MONEY", maskedReference: "+256 77••• ••42", isDefault: true, status: "ACTIVE" });
    await expect(VendorPayoutService.disablePayoutAccount("account-a")).rejects.toThrow("replacement payout method");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...input, provider: "CARD" }, "supported Mobile Money provider"],
    [{ ...input, mobileNumber: "123" }, "valid Ugandan Mobile Money number"],
    [{ ...input, accountHolderName: "" }, "account holder name"],
  ])("rejects invalid payout input", async (invalidInput, message) => {
    await expect(VendorPayoutService.addPayoutAccount(invalidInput)).rejects.toThrow(message);
  });

  it("rejects duplicate accounts without writing a new encrypted reference", async () => {
    mocks.findUnique.mockResolvedValue({ id: "existing" });
    await expect(VendorPayoutService.addPayoutAccount(input)).rejects.toThrow("already configured");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects manager, staff, unrelated, and client-supplied-vendor attempts at the server context boundary", async () => {
    for (const role of ["MANAGER", "STAFF", "UNRELATED"] as const) {
      mocks.context.mockRejectedValueOnce(new Error(`${role} denied`));
      const clientPayload = { ...input, vendorId: "other-vendor" };
      await expect(VendorPayoutService.addPayoutAccount(clientPayload)).rejects.toThrow(`${role} denied`);
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
