CREATE TYPE "FulfillmentMethod" AS ENUM ('DELIVERY', 'PICKUP');

ALTER TABLE "VendorProfile"
  ADD COLUMN "fulfillmentMethods" "FulfillmentMethod"[] NOT NULL DEFAULT ARRAY['DELIVERY']::"FulfillmentMethod"[],
  ADD COLUMN "deliveryFee" DECIMAL(18,2) NOT NULL DEFAULT 3500.00,
  ADD COLUMN "deliveryEstimate" TEXT,
  ADD COLUMN "pickupLocation" TEXT,
  ADD COLUMN "pickupDirections" TEXT,
  ADD COLUMN "pickupInstructions" TEXT,
  ADD COLUMN "returnWindowDays" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "returnPolicy" TEXT,
  ADD COLUMN "returnInstructions" TEXT,
  ADD COLUMN "returnAddress" TEXT,
  ADD COLUMN "acceptsExchanges" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SubOrder"
  ADD COLUMN "fulfillmentMethod" "FulfillmentMethod" NOT NULL DEFAULT 'DELIVERY',
  ADD COLUMN "fulfillmentSnapshot" JSONB,
  ADD COLUMN "refundPolicySnapshot" JSONB;
