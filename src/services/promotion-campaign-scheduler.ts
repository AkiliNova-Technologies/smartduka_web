import { ProductStatus, VendorStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

/** Temporary suspension pauses public delivery but preserves a paid booking. */
export const promotionRecoveryShopStatuses = [VendorStatus.BANNED, VendorStatus.CANCELLED] as const;

/** Idempotent lifecycle repair; public marketing reads still enforce dates and eligibility. */
export class PromotionCampaignScheduler {
  static async run() {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const expiring = await tx.promotionReservation.findMany({
        where: { status: "HOLD", holdExpiresAt: { lte: now } },
        select: { campaign: { select: { id: true, vendorId: true, creditApplied: true } } },
      });
      const expiringIds = expiring.map((row) => row.campaign.id);
      const expired = await tx.promotionReservation.updateMany({
        where: { campaignId: { in: expiringIds }, status: "HOLD" },
        data: { status: "EXPIRED", holdExpiresAt: null },
      });
      if (expiringIds.length) {
        await tx.promotionCampaign.updateMany({
          where: { id: { in: expiringIds }, status: "AWAITING_PAYMENT" },
          data: { status: "PAYMENT_FAILED", fulfillmentStatus: "CANCELLED" },
        });
        await tx.platformRevenueOrder.updateMany({
          where: { campaignId: { in: expiringIds }, status: "AWAITING_PAYMENT" },
          data: { status: "CANCELLED" },
        });
        await Promise.all(expiring.filter((row) => Number(row.campaign.creditApplied) > 0).map((row) => tx.promotionCreditLedger.upsert({
          where: { releaseKey: `promotion-credit-release:${row.campaign.id}` },
          update: {},
          create: { vendorId: row.campaign.vendorId, campaignId: row.campaign.id, type: "RELEASE", amount: row.campaign.creditApplied, releaseKey: `promotion-credit-release:${row.campaign.id}`, reason: "PAYMENT_HOLD_EXPIRED" },
        })));
      }

      const ineligibleProducts = await tx.promotionCampaign.findMany({
        where: { placement: "HOMEPAGE_FEATURED_PRODUCTS", status: { in: ["ACTIVE", "SCHEDULED"] }, OR: [
          { productId: null },
          { product: { status: { notIn: [ProductStatus.ACTIVE, ProductStatus.PUBLISHED] } } },
          { product: { deletedAt: { not: null } } },
          // A temporary shop suspension hides delivery through the public
          // query predicate, but must not destroy a paid slot commitment.
          // Restoration can therefore resume an otherwise eligible campaign.
          { vendor: { status: { in: [...promotionRecoveryShopStatuses] } } },
          { vendor: { deletedAt: { not: null } } },
        ] },
        select: { id: true },
      });
      const ineligibleShops = await tx.promotionCampaign.findMany({
        where: { placement: "HOMEPAGE_FEATURED_SHOPS", status: { in: ["ACTIVE", "SCHEDULED"] }, OR: [
          { vendor: { status: { in: [...promotionRecoveryShopStatuses] } } },
          { vendor: { deletedAt: { not: null } } },
        ] },
        select: { id: true },
      });
      const ineligibleIds = [...ineligibleProducts, ...ineligibleShops].map((row) => row.id);
      await tx.promotionReservation.updateMany({
        where: { campaignId: { in: ineligibleIds }, status: "CONFIRMED" },
        data: { status: "RECOVERY_REQUIRED" },
      });
      const ineligible = await tx.promotionCampaign.updateMany({
        where: { id: { in: ineligibleIds } },
        data: { status: "REVIEW_REQUIRED", fulfillmentStatus: "INELIGIBLE" },
      });
      const activated = await tx.promotionCampaign.updateMany({
        where: { status: "SCHEDULED", fulfillmentStatus: "CONFIRMED", reservation: { status: "CONFIRMED" }, startAt: { lte: now }, endAt: { gt: now } },
        data: { status: "ACTIVE", fulfillmentStatus: "DELIVERING" },
      });
      const completed = await tx.promotionCampaign.updateMany({
        where: { status: { in: ["ACTIVE", "SCHEDULED"] }, endAt: { lte: now } },
        data: { status: "COMPLETED", fulfillmentStatus: "COMPLETED" },
      });
      return { expiredHolds: expired.count, ineligible: ineligible.count, activated: activated.count, completed: completed.count };
    });
  }
}
