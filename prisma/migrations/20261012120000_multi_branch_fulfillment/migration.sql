CREATE TYPE "ShopBranchType" AS ENUM ('STORE', 'WAREHOUSE', 'PICKUP_POINT');
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED');

CREATE TABLE "ShopBranch" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "branchType" "ShopBranchType" NOT NULL DEFAULT 'STORE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "addressLine" TEXT,
    "city" TEXT,
    "district" TEXT,
    "country" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "contactPhone" TEXT,
    "openingHours" JSONB,
    "pickupInstructions" TEXT,
    "deliveryAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deliveryFee" DECIMAL(18,2),
    "deliveryEstimate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShopBranch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SubOrder" ADD COLUMN "branchId" TEXT;
ALTER TABLE "SubOrder" ADD COLUMN "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING';
CREATE UNIQUE INDEX "ShopBranch_shopId_name_key" ON "ShopBranch"("shopId", "name");
CREATE UNIQUE INDEX "ShopBranch_shopId_slug_key" ON "ShopBranch"("shopId", "slug");
CREATE UNIQUE INDEX "ShopBranch_one_primary_per_shop" ON "ShopBranch"("shopId") WHERE "isPrimary" = true;
CREATE INDEX "ShopBranch_shopId_isActive_idx" ON "ShopBranch"("shopId", "isActive");
CREATE INDEX "SubOrder_branchId_idx" ON "SubOrder"("branchId");
ALTER TABLE "ShopBranch" ADD CONSTRAINT "ShopBranch_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubOrder" ADD CONSTRAINT "SubOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "ShopBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
