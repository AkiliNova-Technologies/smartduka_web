-- Verified reviews are tied to immutable purchase records. Delivery is the
-- qualifying fulfilment state; refund policy remains conservative in service code.
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'PENDING', 'HIDDEN', 'REMOVED');
CREATE TYPE "ReviewReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

ALTER TABLE "ProductReview"
  DROP CONSTRAINT IF EXISTS "ProductReview_productId_userId_key",
  DROP COLUMN IF EXISTS "reply",
  DROP COLUMN IF EXISTS "replyAt",
  ADD COLUMN "orderItemId" TEXT,
  ADD COLUMN "variantId" TEXT,
  ADD COLUMN "title" VARCHAR(120),
  ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED';

-- Existing legacy reviews have no trustworthy order-item proof and are retained
-- privately rather than presented as verified marketplace feedback.
UPDATE "ProductReview" SET "status" = 'HIDDEN' WHERE "orderItemId" IS NULL;

CREATE UNIQUE INDEX "ProductReview_orderItemId_key" ON "ProductReview"("orderItemId");
CREATE INDEX "ProductReview_productId_status_createdAt_idx" ON "ProductReview"("productId", "status", "createdAt");
CREATE INDEX "ProductReview_variantId_idx" ON "ProductReview"("variantId");

ALTER TABLE "ProductReview"
  ADD CONSTRAINT "ProductReview_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductReview_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ShopReview" (
  "id" TEXT NOT NULL, "vendorId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "subOrderId" TEXT NOT NULL, "rating" INTEGER NOT NULL, "comment" TEXT,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ShopReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShopReview_subOrderId_key" ON "ShopReview"("subOrderId");
CREATE INDEX "ShopReview_vendorId_status_createdAt_idx" ON "ShopReview"("vendorId", "status", "createdAt");
CREATE INDEX "ShopReview_userId_idx" ON "ShopReview"("userId");
ALTER TABLE "ShopReview" ADD CONSTRAINT "ShopReview_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopReview" ADD CONSTRAINT "ShopReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopReview" ADD CONSTRAINT "ShopReview_subOrderId_fkey" FOREIGN KEY ("subOrderId") REFERENCES "SubOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ReviewReply" ("id" TEXT NOT NULL, "productReviewId" TEXT, "shopReviewId" TEXT, "vendorId" TEXT NOT NULL, "userId" TEXT NOT NULL, "body" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ReviewReply_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ReviewReply_productReviewId_key" ON "ReviewReply"("productReviewId");
CREATE UNIQUE INDEX "ReviewReply_shopReviewId_key" ON "ReviewReply"("shopReviewId");
CREATE INDEX "ReviewReply_vendorId_idx" ON "ReviewReply"("vendorId");
ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_productReviewId_fkey" FOREIGN KEY ("productReviewId") REFERENCES "ProductReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_shopReviewId_fkey" FOREIGN KEY ("shopReviewId") REFERENCES "ShopReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ReviewReport" ("id" TEXT NOT NULL, "productReviewId" TEXT, "shopReviewId" TEXT, "reporterId" TEXT NOT NULL, "reason" TEXT NOT NULL, "status" "ReviewReportStatus" NOT NULL DEFAULT 'OPEN', "resolvedById" TEXT, "resolution" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ReviewReport_productReviewId_reporterId_key" ON "ReviewReport"("productReviewId", "reporterId");
CREATE UNIQUE INDEX "ReviewReport_shopReviewId_reporterId_key" ON "ReviewReport"("shopReviewId", "reporterId");
CREATE INDEX "ReviewReport_status_createdAt_idx" ON "ReviewReport"("status", "createdAt");
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_productReviewId_fkey" FOREIGN KEY ("productReviewId") REFERENCES "ProductReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_shopReviewId_fkey" FOREIGN KEY ("shopReviewId") REFERENCES "ShopReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "ShopReview" ADD CONSTRAINT "ShopReview_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_exactly_one_review" CHECK (("productReviewId" IS NULL) <> ("shopReviewId" IS NULL));
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_exactly_one_review" CHECK (("productReviewId" IS NULL) <> ("shopReviewId" IS NULL));
