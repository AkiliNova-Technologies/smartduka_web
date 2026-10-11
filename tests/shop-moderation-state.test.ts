import { describe, expect, it } from "vitest";
import { VendorStatus, VerificationStatus } from "@prisma/client";
import {
  ShopModerationError,
  resolveShopModerationState,
  transitionShopModerationState,
} from "@/services/shop-moderation";

describe("shop moderation lifecycle", () => {
  it.each([
    ["PENDING", "APPROVE", "APPROVED"],
    ["PENDING", "REJECT", "REJECTED"],
    ["APPROVED", "SUSPEND", "SUSPENDED"],
    ["APPROVED", "BAN", "BANNED"],
    ["SUSPENDED", "RESTORE", "APPROVED"],
    ["SUSPENDED", "BAN", "BANNED"],
  ] as const)("allows %s -> %s", (from, action, to) => {
    expect(transitionShopModerationState(from, action)).toBe(to);
  });

  it.each([
    ["PENDING", "SUSPEND"],
    ["APPROVED", "REJECT"],
    ["SUSPENDED", "REJECT"],
    ["REJECTED", "SUSPEND"],
    ["REJECTED", "APPROVE"],
    ["BANNED", "RESTORE"],
  ] as const)("rejects %s -> %s", (from, action) => {
    expect(() => transitionShopModerationState(from, action)).toThrow(ShopModerationError);
  });

  it("keeps application rejection separate from operational suspension", () => {
    expect(resolveShopModerationState(VerificationStatus.REJECTED, null)).toBe("REJECTED");
    expect(resolveShopModerationState(VerificationStatus.APPROVED, VendorStatus.SUSPENDED)).toBe("SUSPENDED");
    expect(resolveShopModerationState(VerificationStatus.APPROVED, VendorStatus.ACTIVE)).toBe("APPROVED");
  });
});
