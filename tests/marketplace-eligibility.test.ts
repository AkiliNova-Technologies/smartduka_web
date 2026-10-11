import { describe, expect, it } from "vitest";
import { ProductStatus, VendorStatus } from "@prisma/client";
import { isShopOperational, publicProductWhere, publicShopWhere } from "@/lib/marketplace-eligibility";
import { promotionRecoveryShopStatuses } from "@/services/promotion-campaign-scheduler";

describe("marketplace eligibility predicates", () => {
  it("only treats ACTIVE operational shops as public", () => {
    expect(publicShopWhere).toEqual({ status: VendorStatus.ACTIVE, deletedAt: null });
    expect(isShopOperational(VendorStatus.ACTIVE)).toBe(true);
    expect(isShopOperational(VendorStatus.SUSPENDED)).toBe(false);
    expect(isShopOperational(VendorStatus.BANNED)).toBe(false);
    expect(isShopOperational(VendorStatus.PENDING)).toBe(false);
  });

  it("requires both a public product status and an operational shop", () => {
    expect(publicProductWhere).toEqual({
      status: { in: [ProductStatus.ACTIVE, ProductStatus.PUBLISHED] },
      deletedAt: null,
      vendor: publicShopWhere,
    });
  });

  it("pauses paid advertising during suspension without forfeiting its reservation", () => {
    expect(promotionRecoveryShopStatuses).toEqual([VendorStatus.BANNED, VendorStatus.CANCELLED]);
    expect(promotionRecoveryShopStatuses).not.toContain(VendorStatus.SUSPENDED);
  });
});
