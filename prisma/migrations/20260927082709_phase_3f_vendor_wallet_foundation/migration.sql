-- DropForeignKey
ALTER TABLE "FinancialLedger" DROP CONSTRAINT "FinancialLedger_vendorId_fkey";

-- DropIndex
DROP INDEX "FinancialLedger_createdAt_idx";

-- DropIndex
DROP INDEX "FinancialLedger_type_idx";

-- DropIndex
DROP INDEX "FinancialLedger_vendorId_idx";

-- AddForeignKey
ALTER TABLE "FinancialLedger" ADD CONSTRAINT "FinancialLedger_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
