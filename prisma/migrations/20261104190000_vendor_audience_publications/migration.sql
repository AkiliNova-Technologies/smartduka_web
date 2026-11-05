CREATE TYPE "StorePublicationKind" AS ENUM ('ANNOUNCEMENT', 'FOLLOWER_CAMPAIGN');
CREATE TYPE "StorePublicationStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED', 'EXPIRED');
CREATE TYPE "StorePublicationDestination" AS ENUM ('STOREFRONT', 'PRODUCT');

CREATE TABLE "StorePublication" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "kind" "StorePublicationKind" NOT NULL,
  "status" "StorePublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "title" VARCHAR(160) NOT NULL,
  "body" VARCHAR(2000) NOT NULL,
  "imageUrl" VARCHAR(1000),
  "destination" "StorePublicationDestination" NOT NULL DEFAULT 'STOREFRONT',
  "destinationProductId" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "publishedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorePublication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StorePublicationProduct" (
  "publicationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "StorePublicationProduct_pkey" PRIMARY KEY ("publicationId", "productId")
);

CREATE TABLE "StorePublicationEvent" (
  "id" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "eventKey" VARCHAR(191) NOT NULL,
  "audienceType" VARCHAR(40) NOT NULL DEFAULT 'STORE_FOLLOWERS',
  "notificationEligible" BOOLEAN NOT NULL DEFAULT false,
  "eligibilityMetadata" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorePublicationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StorePublication_vendorId_kind_status_createdAt_idx" ON "StorePublication"("vendorId", "kind", "status", "createdAt");
CREATE INDEX "StorePublication_status_scheduledAt_idx" ON "StorePublication"("status", "scheduledAt");
CREATE INDEX "StorePublication_status_publishedAt_expiresAt_idx" ON "StorePublication"("status", "publishedAt", "expiresAt");
CREATE INDEX "StorePublicationProduct_productId_idx" ON "StorePublicationProduct"("productId");
CREATE UNIQUE INDEX "StorePublicationEvent_publicationId_key" ON "StorePublicationEvent"("publicationId");
CREATE UNIQUE INDEX "StorePublicationEvent_eventKey_key" ON "StorePublicationEvent"("eventKey");
CREATE INDEX "StorePublicationEvent_vendorId_publishedAt_idx" ON "StorePublicationEvent"("vendorId", "publishedAt");

ALTER TABLE "StorePublication" ADD CONSTRAINT "StorePublication_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorePublication" ADD CONSTRAINT "StorePublication_destinationProductId_fkey" FOREIGN KEY ("destinationProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StorePublication" ADD CONSTRAINT "StorePublication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StorePublication" ADD CONSTRAINT "StorePublication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StorePublication" ADD CONSTRAINT "StorePublication_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StorePublicationProduct" ADD CONSTRAINT "StorePublicationProduct_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "StorePublication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorePublicationProduct" ADD CONSTRAINT "StorePublicationProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorePublicationEvent" ADD CONSTRAINT "StorePublicationEvent_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "StorePublication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorePublicationEvent" ADD CONSTRAINT "StorePublicationEvent_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
