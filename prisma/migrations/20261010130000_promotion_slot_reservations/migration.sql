CREATE TYPE "AdvertisingPlacement" AS ENUM ('HOMEPAGE_FEATURED_PRODUCTS', 'HOMEPAGE_FEATURED_SHOPS');
CREATE TYPE "PromotionReservationStatus" AS ENUM ('HOLD', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'RECOVERY_REQUIRED');
CREATE TYPE "PromotionFulfillmentStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'DELIVERING', 'COMPLETED', 'INELIGIBLE', 'RECOVERY_REQUIRED', 'CANCELLED');

ALTER TABLE "PromotionCampaign" ADD COLUMN "placement" "AdvertisingPlacement";
ALTER TABLE "PromotionCampaign" ADD COLUMN "fulfillmentStatus" "PromotionFulfillmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT';
UPDATE "PromotionCampaign" SET "placement" = CASE WHEN "targetType" = 'PRODUCT' THEN 'HOMEPAGE_FEATURED_PRODUCTS'::"AdvertisingPlacement" ELSE 'HOMEPAGE_FEATURED_SHOPS'::"AdvertisingPlacement" END;
ALTER TABLE "PromotionCampaign" ALTER COLUMN "placement" SET NOT NULL;

CREATE TABLE "AdvertisingPlacementInventory" (
  "id" TEXT NOT NULL,
  "placement" "AdvertisingPlacement" NOT NULL,
  "capacity" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdvertisingPlacementInventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdvertisingPlacementInventory_capacity_check" CHECK ("capacity" > 0)
);
CREATE UNIQUE INDEX "AdvertisingPlacementInventory_placement_key" ON "AdvertisingPlacementInventory"("placement");

CREATE TABLE "PromotionReservation" (
  "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "placement" "AdvertisingPlacement" NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL, "endAt" TIMESTAMP(3) NOT NULL, "holdExpiresAt" TIMESTAMP(3),
  "status" "PromotionReservationStatus" NOT NULL, "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromotionReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PromotionReservation_interval_check" CHECK ("startAt" < "endAt"),
  CONSTRAINT "PromotionReservation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromotionCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX "PromotionReservation_campaignId_key" ON "PromotionReservation"("campaignId");
CREATE INDEX "PromotionReservation_placement_status_startAt_endAt_idx" ON "PromotionReservation"("placement", "status", "startAt", "endAt");
CREATE INDEX "PromotionReservation_status_holdExpiresAt_idx" ON "PromotionReservation"("status", "holdExpiresAt");

CREATE TABLE "PromotionQuote" (
  "id" TEXT NOT NULL, "vendorId" TEXT NOT NULL, "targetType" "PromotionCampaignTargetType" NOT NULL,
  "productId" TEXT, "placement" "AdvertisingPlacement" NOT NULL, "durationDays" INTEGER NOT NULL,
  "requestedStartAt" TIMESTAMP(3), "startAt" TIMESTAMP(3) NOT NULL, "endAt" TIMESTAMP(3) NOT NULL,
  "dailyRate" DECIMAL(18,2) NOT NULL, "subtotal" DECIMAL(18,2) NOT NULL,
  "creditApplied" DECIMAL(18,2) NOT NULL, "amountDue" DECIMAL(18,2) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromotionQuote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PromotionQuote_vendorId_expiresAt_idx" ON "PromotionQuote"("vendorId", "expiresAt");

INSERT INTO "AdvertisingPlacementInventory" ("id", "placement", "capacity", "updatedAt") VALUES
  (gen_random_uuid()::text, 'HOMEPAGE_FEATURED_PRODUCTS', 2, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'HOMEPAGE_FEATURED_SHOPS', 2, CURRENT_TIMESTAMP);

-- Preserve any commitments that predate slot inventory. These become confirmed
-- reservations instead of silently disappearing from placement delivery.
INSERT INTO "PromotionReservation" (
  "id", "campaignId", "placement", "startAt", "endAt", "status", "confirmedAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  "id",
  "placement",
  "startAt",
  "endAt",
  'CONFIRMED'::"PromotionReservationStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PromotionCampaign"
WHERE "status" IN ('ACTIVE', 'SCHEDULED')
  AND "startAt" IS NOT NULL
  AND "endAt" IS NOT NULL;

UPDATE "PromotionCampaign"
SET "fulfillmentStatus" = CASE
  WHEN "status" = 'ACTIVE' THEN 'DELIVERING'::"PromotionFulfillmentStatus"
  WHEN "status" = 'SCHEDULED' THEN 'CONFIRMED'::"PromotionFulfillmentStatus"
  WHEN "status" = 'COMPLETED' THEN 'COMPLETED'::"PromotionFulfillmentStatus"
  WHEN "status" IN ('CANCELLED', 'PAYMENT_FAILED') THEN 'CANCELLED'::"PromotionFulfillmentStatus"
  ELSE "fulfillmentStatus"
END;
