-- DropForeignKey
ALTER TABLE "Refund" DROP CONSTRAINT "Refund_returnRequestId_fkey";

-- DropIndex
DROP INDEX "FinancialLedger_refundId_idx";

-- DropIndex
DROP INDEX "Refund_subOrderId_status_amount_idx";
