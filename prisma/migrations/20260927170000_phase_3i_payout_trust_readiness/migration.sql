ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_DISBURSEMENT';
CREATE TYPE "DeliveryConfirmationSource" AS ENUM ('CUSTOMER', 'PLATFORM_ADMIN', 'LOGISTICS');
ALTER TABLE "SubOrder" ADD COLUMN "deliveryConfirmedAt" TIMESTAMP(3), ADD COLUMN "deliveryConfirmedByUserId" TEXT, ADD COLUMN "deliveryConfirmationSource" "DeliveryConfirmationSource";
ALTER TABLE "VendorPayout" ADD COLUMN "readyAt" TIMESTAMP(3), ADD COLUMN "merchantReference" TEXT;
CREATE UNIQUE INDEX "VendorPayout_merchantReference_key" ON "VendorPayout"("merchantReference");
