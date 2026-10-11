-- Platform revenue is distinct from marketplace customer-to-vendor payments.
CREATE TYPE "PlatformRevenueOrderType" AS ENUM ('SUBSCRIPTION', 'PRODUCT_PROMOTION', 'SHOP_PROMOTION', 'FUTURE_SERVICE');
CREATE TYPE "PlatformRevenueOrderStatus" AS ENUM ('DRAFT', 'AWAITING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'REVIEW_REQUIRED');
CREATE TYPE "PlatformPaymentIntentStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED', 'EXPIRED', 'CANCELLED', 'REVERSED');
CREATE TYPE "PromotionCampaignTargetType" AS ENUM ('PRODUCT', 'SHOP');
CREATE TYPE "PromotionCampaignStatus" AS ENUM ('DRAFT', 'AWAITING_PAYMENT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'PAYMENT_FAILED', 'CANCELLED', 'REVIEW_REQUIRED');
CREATE TYPE "PromotionCreditLedgerType" AS ENUM ('GRANT', 'REDEMPTION', 'EXPIRY', 'ADJUSTMENT');

ALTER TABLE "VendorProfile" ADD COLUMN "trialStartedAt" TIMESTAMP(3);
-- Deterministic beta backfill: existing active shops receive a new trial from deployment.
UPDATE "VendorProfile" SET "trialStartedAt" = CURRENT_TIMESTAMP, "trialEndsAt" = CURRENT_TIMESTAMP + INTERVAL '30 days' WHERE "status" = 'ACTIVE' AND "trialEndsAt" IS NULL;

CREATE TABLE "PromotionCampaign" (
  "id" TEXT NOT NULL, "vendorId" TEXT NOT NULL, "targetType" "PromotionCampaignTargetType" NOT NULL,
  "productId" TEXT, "dailyRate" DECIMAL(18,2) NOT NULL, "durationDays" INTEGER NOT NULL,
  "subtotal" DECIMAL(18,2) NOT NULL, "creditApplied" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "amountDue" DECIMAL(18,2) NOT NULL, "currency" VARCHAR(3) NOT NULL DEFAULT 'UGX',
  "requestedStartAt" TIMESTAMP(3), "startAt" TIMESTAMP(3), "endAt" TIMESTAMP(3),
  "status" "PromotionCampaignStatus" NOT NULL DEFAULT 'DRAFT', "fundingSource" TEXT, "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromotionCampaign_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PromotionCampaign_vendorId_idempotencyKey_key" ON "PromotionCampaign"("vendorId", "idempotencyKey");
CREATE INDEX "PromotionCampaign_vendorId_status_idx" ON "PromotionCampaign"("vendorId", "status");
CREATE INDEX "PromotionCampaign_startAt_endAt_idx" ON "PromotionCampaign"("startAt", "endAt");
ALTER TABLE "PromotionCampaign" ADD CONSTRAINT "PromotionCampaign_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionCampaign" ADD CONSTRAINT "PromotionCampaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PromotionCreditLedger" (
  "id" TEXT NOT NULL, "vendorId" TEXT NOT NULL, "type" "PromotionCreditLedgerType" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL, "grantKey" TEXT, "reason" TEXT NOT NULL, "expiresAt" TIMESTAMP(3),
  "campaignId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromotionCreditLedger_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PromotionCreditLedger_grantKey_key" ON "PromotionCreditLedger"("grantKey");
CREATE INDEX "PromotionCreditLedger_vendorId_createdAt_idx" ON "PromotionCreditLedger"("vendorId", "createdAt");
ALTER TABLE "PromotionCreditLedger" ADD CONSTRAINT "PromotionCreditLedger_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionCreditLedger" ADD CONSTRAINT "PromotionCreditLedger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromotionCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PlatformRevenueOrder" (
  "id" TEXT NOT NULL, "vendorId" TEXT NOT NULL, "type" "PlatformRevenueOrderType" NOT NULL,
  "status" "PlatformRevenueOrderStatus" NOT NULL DEFAULT 'DRAFT', "campaignId" TEXT,
  "subtotal" DECIMAL(18,2) NOT NULL, "creditApplied" DECIMAL(18,2) NOT NULL DEFAULT 0, "amountDue" DECIMAL(18,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'UGX', "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformRevenueOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformRevenueOrder_campaignId_key" ON "PlatformRevenueOrder"("campaignId");
CREATE UNIQUE INDEX "PlatformRevenueOrder_vendorId_idempotencyKey_key" ON "PlatformRevenueOrder"("vendorId", "idempotencyKey");
ALTER TABLE "PlatformRevenueOrder" ADD CONSTRAINT "PlatformRevenueOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformRevenueOrder" ADD CONSTRAINT "PlatformRevenueOrder_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromotionCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PlatformPaymentIntent" (
  "id" TEXT NOT NULL, "platformRevenueOrderId" TEXT NOT NULL, "vendorId" TEXT NOT NULL, "provider" "PaymentProvider" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL, "currency" VARCHAR(3) NOT NULL DEFAULT 'UGX', "status" "PlatformPaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
  "providerReference" TEXT, "idempotencyKey" TEXT, "merchantDestinationMasked" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformPaymentIntent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformPaymentIntent_providerReference_key" ON "PlatformPaymentIntent"("providerReference");
CREATE UNIQUE INDEX "PlatformPaymentIntent_platformRevenueOrderId_idempotencyKey_key" ON "PlatformPaymentIntent"("platformRevenueOrderId", "idempotencyKey");
ALTER TABLE "PlatformPaymentIntent" ADD CONSTRAINT "PlatformPaymentIntent_platformRevenueOrderId_fkey" FOREIGN KEY ("platformRevenueOrderId") REFERENCES "PlatformRevenueOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformPaymentIntent" ADD CONSTRAINT "PlatformPaymentIntent_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
