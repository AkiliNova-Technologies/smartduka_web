import { VendorStatus, VerificationStatus } from "@prisma/client";

export type ShopModerationState = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "BANNED";
export type ShopModerationAction = "APPROVE" | "REJECT" | "SUSPEND" | "RESTORE" | "BAN";

export class ShopModerationError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "INVALID_TRANSITION" | "REASON_REQUIRED" | "CONCURRENT_MODIFICATION",
  ) {
    super(message);
    this.name = "ShopModerationError";
  }
}

const pendingApplicationStatuses = new Set<VerificationStatus>([
  VerificationStatus.PENDING,
  VerificationStatus.SUBMITTED,
  VerificationStatus.UNDER_REVIEW,
]);

export function resolveShopModerationState(applicationStatus: VerificationStatus, vendorStatus?: VendorStatus | null): ShopModerationState {
  if (vendorStatus === VendorStatus.ACTIVE) return "APPROVED";
  if (vendorStatus === VendorStatus.SUSPENDED) return "SUSPENDED";
  if (vendorStatus === VendorStatus.BANNED || vendorStatus === VendorStatus.CANCELLED) return "BANNED";
  if (applicationStatus === VerificationStatus.REJECTED) return "REJECTED";
  if (pendingApplicationStatuses.has(applicationStatus)) return "PENDING";
  return "PENDING";
}

const transitions: Record<ShopModerationState, Partial<Record<ShopModerationAction, ShopModerationState>>> = {
  PENDING: { APPROVE: "APPROVED", REJECT: "REJECTED" },
  APPROVED: { SUSPEND: "SUSPENDED", BAN: "BANNED" },
  SUSPENDED: { RESTORE: "APPROVED", BAN: "BANNED" },
  REJECTED: {},
  BANNED: {},
};

export function transitionShopModerationState(current: ShopModerationState, action: ShopModerationAction): ShopModerationState {
  const next = transitions[current][action];
  if (!next) throw new ShopModerationError(`Cannot ${action.toLowerCase()} a shop while it is ${current.toLowerCase()}.`, "INVALID_TRANSITION");
  return next;
}
