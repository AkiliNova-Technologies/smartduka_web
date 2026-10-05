import { PayoutDestinationType, Prisma, VendorPayoutAccountProvider, VendorPayoutAccountStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { encryptPayoutReference, payoutReferenceHash } from "@/lib/vendor-payout-crypto";

export class VendorPayoutError extends Error {
  constructor(message: string, public readonly code: "INVALID_REQUEST" | "DUPLICATE" | "NOT_FOUND" | "INVALID_TRANSITION") { super(message); }
}

const providers = new Set(Object.values(VendorPayoutAccountProvider));
const payoutSelect = {
  id: true, type: true, provider: true, accountHolderName: true, maskedReference: true,
  status: true, isDefault: true, verifiedAt: true, createdAt: true, updatedAt: true,
} satisfies Prisma.VendorPayoutAccountSelect;

export type VendorPayoutAccountDto = Prisma.VendorPayoutAccountGetPayload<{ select: typeof payoutSelect }>;

function normalizeMobileNumber(value: unknown) {
  if (typeof value !== "string") throw new VendorPayoutError("Enter a valid Mobile Money number.", "INVALID_REQUEST");
  const compact = value.trim().replace(/[\s()-]/g, "");
  const local = compact.startsWith("+256") ? `0${compact.slice(4)}` : compact.startsWith("256") ? `0${compact.slice(3)}` : compact;
  if (!/^07\d{8}$/.test(local)) throw new VendorPayoutError("Enter a valid Ugandan Mobile Money number.", "INVALID_REQUEST");
  return `+256${local.slice(1)}`;
}

function maskMobileNumber(reference: string) {
  return `${reference.slice(0, 4)} ${reference.slice(4, 6)}••• ••${reference.slice(-2)}`;
}

function inputFrom(input: { provider?: unknown; accountHolderName?: unknown; mobileNumber?: unknown }) {
  if (typeof input.provider !== "string" || !providers.has(input.provider as VendorPayoutAccountProvider)) throw new VendorPayoutError("Choose a supported Mobile Money provider.", "INVALID_REQUEST");
  if (typeof input.accountHolderName !== "string" || input.accountHolderName.trim().length < 2 || input.accountHolderName.trim().length > 120) throw new VendorPayoutError("Enter the account holder name.", "INVALID_REQUEST");
  return { provider: input.provider as VendorPayoutAccountProvider, accountHolderName: input.accountHolderName.trim(), reference: normalizeMobileNumber(input.mobileNumber) };
}

export class VendorPayoutService {
  static async getPayoutAccounts(): Promise<VendorPayoutAccountDto[]> {
    const context = await requireVendorContext("vendor:request_payout");
    return prisma.vendorPayoutAccount.findMany({ where: { vendorId: context.vendorId }, select: payoutSelect, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  }

  static async getDefaultPayoutAccount() {
    const context = await requireVendorContext("vendor:request_payout");
    return prisma.vendorPayoutAccount.findFirst({ where: { vendorId: context.vendorId, status: VendorPayoutAccountStatus.ACTIVE, isDefault: true }, select: payoutSelect });
  }

  static async addPayoutAccount(input: { provider?: unknown; accountHolderName?: unknown; mobileNumber?: unknown }) {
    const context = await requireVendorContext("vendor:request_payout");
    const account = inputFrom(input);
    const referenceHash = payoutReferenceHash(account.reference);
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.vendorPayoutAccount.findUnique({ where: { vendorId_accountReferenceHash: { vendorId: context.vendorId, accountReferenceHash: referenceHash } }, select: { id: true } });
        if (existing) throw new VendorPayoutError("This payout method is already configured.", "DUPLICATE");
        const previous = await tx.vendorPayoutAccount.findFirst({ where: { vendorId: context.vendorId, isDefault: true }, select: { id: true, provider: true, maskedReference: true } });
        await tx.vendorPayoutAccount.updateMany({ where: { vendorId: context.vendorId, isDefault: true }, data: { isDefault: false, status: VendorPayoutAccountStatus.DISABLED, updatedById: context.user.id } });
        const saved = await tx.vendorPayoutAccount.create({ data: { vendorId: context.vendorId, type: PayoutDestinationType.MOBILE_MONEY, provider: account.provider, accountHolderName: account.accountHolderName, accountReferenceEncrypted: encryptPayoutReference(account.reference), accountReferenceHash: referenceHash, maskedReference: maskMobileNumber(account.reference), status: VendorPayoutAccountStatus.ACTIVE, isDefault: true, createdById: context.user.id, updatedById: context.user.id }, select: payoutSelect });
        await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: previous ? "VENDOR_PAYOUT_DESTINATION_CHANGED" : "VENDOR_PAYOUT_ACCOUNT_ADDED", entity: "VendorPayoutAccount", entityId: saved.id, ...(previous ? { oldValues: { provider: previous.provider, maskedReference: previous.maskedReference }, newValues: { provider: saved.provider, maskedReference: saved.maskedReference, isDefault: true } } : { newValues: { provider: saved.provider, maskedReference: saved.maskedReference, isDefault: true } }) } });
        const vendor = await tx.vendorProfile.findUnique({ where: { id: context.vendorId }, select: { ownerId: true } });
        if (vendor) await tx.notification.create({ data: { vendorId: context.vendorId, userId: vendor.ownerId, type: "WARNING", title: "Payout details changed", message: "Your shop payout details were changed.", actionPath: "/vendor/settings?tab=payouts" } });
        return saved;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof VendorPayoutError) throw error;
      if (typeof error === "object" && error && "code" in error && error.code === "P2002") throw new VendorPayoutError("This payout method is already configured.", "DUPLICATE");
      throw error;
    }
  }

  static async setDefaultPayoutAccount(id: string) {
    const context = await requireVendorContext("vendor:request_payout");
    return prisma.$transaction(async (tx) => {
      const account = await tx.vendorPayoutAccount.findFirst({ where: { id, vendorId: context.vendorId, status: { not: VendorPayoutAccountStatus.DISABLED } }, select: { id: true, maskedReference: true, provider: true, isDefault: true } });
      if (!account) throw new VendorPayoutError("Payout method was not found.", "NOT_FOUND");
      if (account.isDefault) return tx.vendorPayoutAccount.findUniqueOrThrow({ where: { id }, select: payoutSelect });
      const previous = await tx.vendorPayoutAccount.findFirst({ where: { vendorId: context.vendorId, isDefault: true }, select: { provider: true, maskedReference: true } });
      await tx.vendorPayoutAccount.updateMany({ where: { vendorId: context.vendorId, isDefault: true }, data: { isDefault: false, status: VendorPayoutAccountStatus.DISABLED, updatedById: context.user.id } });
      const saved = await tx.vendorPayoutAccount.update({ where: { id }, data: { status: VendorPayoutAccountStatus.ACTIVE, isDefault: true, updatedById: context.user.id }, select: payoutSelect });
      await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "VENDOR_PAYOUT_DEFAULT_CHANGED", entity: "VendorPayoutAccount", entityId: id, oldValues: previous ? { provider: previous.provider, maskedReference: previous.maskedReference } : undefined, newValues: { provider: account.provider, maskedReference: account.maskedReference } } });
      const vendor = await tx.vendorProfile.findUnique({ where: { id: context.vendorId }, select: { ownerId: true } });
      if (vendor) await tx.notification.create({ data: { vendorId: context.vendorId, userId: vendor.ownerId, type: "WARNING", title: "Payout details changed", message: "Your shop payout details were changed.", actionPath: "/vendor/settings?tab=payouts" } });
      return saved;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  static async disablePayoutAccount(id: string) {
    const context = await requireVendorContext("vendor:request_payout");
    return prisma.$transaction(async (tx) => {
      const account = await tx.vendorPayoutAccount.findFirst({ where: { id, vendorId: context.vendorId }, select: { id: true, isDefault: true, status: true, maskedReference: true, provider: true } });
      if (!account) throw new VendorPayoutError("Payout method was not found.", "NOT_FOUND");
      if (account.isDefault && account.status === VendorPayoutAccountStatus.ACTIVE) throw new VendorPayoutError("Add a replacement payout method before disabling the active one.", "INVALID_TRANSITION");
      const saved = await tx.vendorPayoutAccount.update({ where: { id }, data: { status: VendorPayoutAccountStatus.DISABLED, isDefault: false, updatedById: context.user.id }, select: payoutSelect });
      await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "VENDOR_PAYOUT_ACCOUNT_DISABLED", entity: "VendorPayoutAccount", entityId: id, oldValues: { provider: account.provider, maskedReference: account.maskedReference } } });
      const vendor = await tx.vendorProfile.findUnique({ where: { id: context.vendorId }, select: { ownerId: true } });
      if (vendor) await tx.notification.create({ data: { vendorId: context.vendorId, userId: vendor.ownerId, type: "WARNING", title: "Payout details changed", message: "Your shop payout details were changed.", actionPath: "/vendor/settings?tab=payouts" } });
      return saved;
    });
  }
}
