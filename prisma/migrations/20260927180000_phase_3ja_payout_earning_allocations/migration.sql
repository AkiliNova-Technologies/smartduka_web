CREATE TYPE "PayoutAllocationStatus" AS ENUM ('ACTIVE','RELEASED');
CREATE TABLE "VendorPayoutAllocation" ("id" TEXT NOT NULL, "vendorPayoutId" TEXT NOT NULL, "earningLedgerId" TEXT NOT NULL, "vendorId" TEXT NOT NULL, "currency" VARCHAR(3) NOT NULL, "allocatedAmount" DECIMAL(18,2) NOT NULL, "status" "PayoutAllocationStatus" NOT NULL DEFAULT 'ACTIVE', "releasedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "VendorPayoutAllocation_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "VendorPayoutAllocation_vendorPayoutId_earningLedgerId_key" ON "VendorPayoutAllocation"("vendorPayoutId","earningLedgerId");
CREATE INDEX "VendorPayoutAllocation_earningLedgerId_status_idx" ON "VendorPayoutAllocation"("earningLedgerId","status");
CREATE INDEX "VendorPayoutAllocation_vendorId_currency_status_idx" ON "VendorPayoutAllocation"("vendorId","currency","status");
ALTER TABLE "VendorPayoutAllocation" ADD CONSTRAINT "VendorPayoutAllocation_vendorPayoutId_fkey" FOREIGN KEY ("vendorPayoutId") REFERENCES "VendorPayout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorPayoutAllocation" ADD CONSTRAINT "VendorPayoutAllocation_earningLedgerId_fkey" FOREIGN KEY ("earningLedgerId") REFERENCES "FinancialLedger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
