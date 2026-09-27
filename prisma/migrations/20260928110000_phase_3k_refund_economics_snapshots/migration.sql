ALTER TABLE "Refund" ADD COLUMN "platformCommissionAdjustment" DECIMAL(18,2) NOT NULL DEFAULT 0, ADD COLUMN "vendorLiabilityAdjustment" DECIMAL(18,2) NOT NULL DEFAULT 0, ADD COLUMN "shippingAmount" DECIMAL(18,2) NOT NULL DEFAULT 0, ADD COLUMN "gatewayFeeAdjustment" DECIMAL(18,2) NOT NULL DEFAULT 0;
CREATE INDEX "Refund_subOrderId_status_amount_idx" ON "Refund"("subOrderId", "status", "amount");
