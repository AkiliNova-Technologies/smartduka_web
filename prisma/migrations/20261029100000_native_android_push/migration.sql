ALTER TABLE "UserDevice" RENAME COLUMN "pushToken" TO "pushTokenEncrypted";
DROP INDEX IF EXISTS "UserDevice_pushToken_key";
ALTER TABLE "UserDevice"
  ADD COLUMN "pushTokenHash" VARCHAR(64),
  ADD COLUMN "registrationVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "tokenUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastSuccessAt" TIMESTAMP(3),
  ADD COLUMN "lastFailureAt" TIMESTAMP(3),
  ADD COLUMN "failureCount" INTEGER NOT NULL DEFAULT 0;
-- Legacy rows contain plaintext tokens from the pre-FCM contract. Remove them
-- so no plaintext token survives the migration; active apps re-register.
DELETE FROM "UserDevice";
ALTER TABLE "UserDevice" ALTER COLUMN "pushTokenHash" SET NOT NULL;
CREATE UNIQUE INDEX "UserDevice_pushTokenHash_key" ON "UserDevice"("pushTokenHash");

CREATE TABLE "NativePushDelivery" (
  "id" TEXT NOT NULL,
  "outboxId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "status" "PushDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "deliveredAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "failureCode" VARCHAR(120),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NativePushDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NativePushDelivery_outboxId_deviceId_key" ON "NativePushDelivery"("outboxId", "deviceId");
CREATE INDEX "NativePushDelivery_deviceId_idx" ON "NativePushDelivery"("deviceId");
CREATE INDEX "NativePushDelivery_status_updatedAt_idx" ON "NativePushDelivery"("status", "updatedAt");
ALTER TABLE "NativePushDelivery" ADD CONSTRAINT "NativePushDelivery_outboxId_fkey" FOREIGN KEY ("outboxId") REFERENCES "PushDeliveryOutbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NativePushDelivery" ADD CONSTRAINT "NativePushDelivery_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "UserDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
