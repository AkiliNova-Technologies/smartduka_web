CREATE TYPE "PlatformRevenueQualificationKind" AS ENUM ('NONE', 'SANDBOX_QUALIFICATION', 'LIVE_QUALIFICATION');

ALTER TABLE "PlatformRevenueOrder"
  ADD COLUMN "qualificationKind" "PlatformRevenueQualificationKind" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "qualificationId" TEXT;

CREATE UNIQUE INDEX "PlatformRevenueOrder_vendorId_qualificationId_key"
  ON "PlatformRevenueOrder"("vendorId", "qualificationId");
