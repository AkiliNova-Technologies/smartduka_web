CREATE TABLE "CustomerAddress" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "recipientName" TEXT NOT NULL,
  "recipientPhone" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'Uganda',
  "district" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "street" TEXT,
  "building" TEXT,
  "landmark" TEXT NOT NULL,
  "deliveryInstructions" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CustomerAddress_customerId_updatedAt_idx" ON "CustomerAddress"("customerId", "updatedAt");
CREATE INDEX "CustomerAddress_customerId_isDefault_idx" ON "CustomerAddress"("customerId", "isDefault");
CREATE UNIQUE INDEX "CustomerAddress_one_default_per_customer_key"
ON "CustomerAddress" ("customerId")
WHERE "isDefault" = true;

ALTER TABLE "CustomerAddress"
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "CustomerAddress"
FROM anon, authenticated;
