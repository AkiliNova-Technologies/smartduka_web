CREATE TABLE "StoreFollow" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoreFollow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreFollow_customerId_vendorId_key" ON "StoreFollow"("customerId", "vendorId");
CREATE INDEX "StoreFollow_customerId_createdAt_id_idx" ON "StoreFollow"("customerId", "createdAt", "id");
CREATE INDEX "StoreFollow_vendorId_createdAt_idx" ON "StoreFollow"("vendorId", "createdAt");

ALTER TABLE "StoreFollow" ADD CONSTRAINT "StoreFollow_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoreFollow" ADD CONSTRAINT "StoreFollow_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
