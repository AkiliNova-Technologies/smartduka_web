CREATE TYPE "MarketplaceReportTargetType" AS ENUM ('PRODUCT', 'SHOP');
CREATE TYPE "MarketplaceReportReason" AS ENUM ('COUNTERFEIT', 'MISLEADING_INFORMATION', 'PROHIBITED_ITEM', 'INAPPROPRIATE_CONTENT', 'WRONG_CATEGORY', 'PRICE_MANIPULATION', 'INTELLECTUAL_PROPERTY', 'SCAM_OR_FRAUD', 'IMPERSONATION', 'ABUSIVE_BEHAVIOR', 'SPAM', 'OTHER');
CREATE TYPE "MarketplaceReportSeverity" AS ENUM ('UNASSESSED', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "MarketplaceReportStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'AWAITING_INFORMATION', 'ACTION_REQUIRED', 'RESOLVED', 'DISMISSED');
CREATE TYPE "MarketplaceReportResolution" AS ENUM ('NO_VIOLATION', 'PRODUCT_UPDATED', 'PRODUCT_REMOVED', 'SHOP_WARNED', 'SHOP_RESTRICTED', 'SHOP_SUSPENDED', 'CONTENT_REMOVED', 'REFERRED_FOR_FURTHER_REVIEW', 'OTHER');
CREATE TYPE "MarketplaceReportActivityType" AS ENUM ('REPORT_CREATED', 'STATUS_CHANGED', 'SEVERITY_CHANGED', 'ASSIGNED', 'REASSIGNED', 'NOTE_ADDED', 'RESOLUTION_SET', 'REPORT_RESOLVED', 'REPORT_DISMISSED');
ALTER TABLE "Notification" ADD COLUMN "actionPath" TEXT;

CREATE TABLE "MarketplaceReport" (
  "id" TEXT NOT NULL, "publicId" TEXT NOT NULL, "targetType" "MarketplaceReportTargetType" NOT NULL,
  "productId" TEXT, "vendorId" TEXT, "reporterId" TEXT NOT NULL, "reason" "MarketplaceReportReason" NOT NULL,
  "description" TEXT, "severity" "MarketplaceReportSeverity" NOT NULL DEFAULT 'UNASSESSED', "status" "MarketplaceReportStatus" NOT NULL DEFAULT 'SUBMITTED',
  "assignedAdminId" TEXT, "assignedAt" TIMESTAMP(3), "assignedById" TEXT, "resolution" "MarketplaceReportResolution", "resolutionNote" TEXT,
  "resolvedById" TEXT, "resolvedAt" TIMESTAMP(3), "targetTitleSnapshot" TEXT NOT NULL, "targetSlugSnapshot" TEXT, "targetImageSnapshot" TEXT,
  "vendorIdSnapshot" TEXT, "vendorNameSnapshot" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceReport_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MarketplaceReportActivity" ("id" TEXT NOT NULL, "reportId" TEXT NOT NULL, "actorId" TEXT, "type" "MarketplaceReportActivityType" NOT NULL, "fromValue" TEXT, "toValue" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "MarketplaceReportActivity_pkey" PRIMARY KEY ("id"));
CREATE TABLE "MarketplaceReportNote" ("id" TEXT NOT NULL, "reportId" TEXT NOT NULL, "adminId" TEXT NOT NULL, "body" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "MarketplaceReportNote_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "MarketplaceReport_publicId_key" ON "MarketplaceReport"("publicId");
CREATE INDEX "MarketplaceReport_status_severity_createdAt_idx" ON "MarketplaceReport"("status", "severity", "createdAt");
CREATE INDEX "MarketplaceReport_assignedAdminId_status_createdAt_idx" ON "MarketplaceReport"("assignedAdminId", "status", "createdAt");
CREATE INDEX "MarketplaceReport_targetType_productId_idx" ON "MarketplaceReport"("targetType", "productId");
CREATE INDEX "MarketplaceReport_targetType_vendorId_idx" ON "MarketplaceReport"("targetType", "vendorId");
CREATE INDEX "MarketplaceReport_reporterId_createdAt_idx" ON "MarketplaceReport"("reporterId", "createdAt");
CREATE INDEX "MarketplaceReport_resolvedAt_idx" ON "MarketplaceReport"("resolvedAt");
CREATE INDEX "MarketplaceReportActivity_reportId_createdAt_idx" ON "MarketplaceReportActivity"("reportId", "createdAt");
CREATE INDEX "MarketplaceReportNote_reportId_createdAt_idx" ON "MarketplaceReportNote"("reportId", "createdAt");
ALTER TABLE "MarketplaceReport" ADD CONSTRAINT "MarketplaceReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReport" ADD CONSTRAINT "MarketplaceReport_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReport" ADD CONSTRAINT "MarketplaceReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReport" ADD CONSTRAINT "MarketplaceReport_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReport" ADD CONSTRAINT "MarketplaceReport_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReport" ADD CONSTRAINT "MarketplaceReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReportActivity" ADD CONSTRAINT "MarketplaceReportActivity_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MarketplaceReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReportActivity" ADD CONSTRAINT "MarketplaceReportActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReportNote" ADD CONSTRAINT "MarketplaceReportNote_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MarketplaceReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReportNote" ADD CONSTRAINT "MarketplaceReportNote_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
