CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_CUSTOMER', 'RESOLVED_VENDOR', 'REJECTED', 'CANCELLED');
CREATE TYPE "RiskFlagScope" AS ENUM ('CUSTOMER', 'VENDOR', 'ORDER', 'SUBORDER', 'PAYMENT', 'PAYOUT');
CREATE TYPE "RiskFlagCategory" AS ENUM ('SUSPICIOUS_PAYMENT', 'ACCOUNT_TAKEOVER_SUSPECTED', 'UNUSUAL_ORDER_ACTIVITY', 'REFUND_ABUSE', 'VENDOR_FULFILLMENT_RISK', 'MANUAL_REVIEW');
CREATE TYPE "RiskFlagSource" AS ENUM ('SYSTEM', 'ADMIN');
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "RiskFlagStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

CREATE TABLE "Dispute" (
  "id" TEXT NOT NULL, "customerId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "subOrderId" TEXT NOT NULL, "vendorId" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "description" TEXT NOT NULL, "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN', "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3), "resolvedByUserId" TEXT, "resolution" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RiskFlag" (
  "id" TEXT NOT NULL, "scope" "RiskFlagScope" NOT NULL, "category" "RiskFlagCategory" NOT NULL, "source" "RiskFlagSource" NOT NULL DEFAULT 'ADMIN', "severity" "RiskSeverity" NOT NULL, "status" "RiskFlagStatus" NOT NULL DEFAULT 'OPEN', "reason" TEXT NOT NULL,
  "customerId" TEXT, "vendorId" TEXT, "orderId" TEXT, "subOrderId" TEXT, "payoutId" TEXT, "createdByUserId" TEXT NOT NULL, "resolvedByUserId" TEXT, "resolvedAt" TIMESTAMP(3), "resolution" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiskFlag_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Dispute_customerId_createdAt_idx" ON "Dispute"("customerId", "createdAt");
CREATE INDEX "Dispute_vendorId_status_idx" ON "Dispute"("vendorId", "status");
CREATE INDEX "Dispute_subOrderId_status_idx" ON "Dispute"("subOrderId", "status");
CREATE INDEX "Dispute_orderId_idx" ON "Dispute"("orderId");
CREATE UNIQUE INDEX "Dispute_active_customer_suborder_key" ON "Dispute"("customerId", "subOrderId") WHERE "status" IN ('OPEN', 'UNDER_REVIEW');
CREATE INDEX "RiskFlag_status_severity_idx" ON "RiskFlag"("status", "severity");
CREATE INDEX "RiskFlag_vendorId_status_idx" ON "RiskFlag"("vendorId", "status");
CREATE INDEX "RiskFlag_subOrderId_status_idx" ON "RiskFlag"("subOrderId", "status");
CREATE INDEX "RiskFlag_orderId_status_idx" ON "RiskFlag"("orderId", "status");
CREATE INDEX "RiskFlag_payoutId_status_idx" ON "RiskFlag"("payoutId", "status");
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_subOrderId_fkey" FOREIGN KEY ("subOrderId") REFERENCES "SubOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_subOrderId_fkey" FOREIGN KEY ("subOrderId") REFERENCES "SubOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "VendorPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Dispute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiskFlag" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Dispute", "RiskFlag" FROM anon, authenticated;
