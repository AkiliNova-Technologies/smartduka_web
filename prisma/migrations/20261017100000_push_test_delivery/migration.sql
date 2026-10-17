ALTER TYPE "PushDeliveryKind" ADD VALUE IF NOT EXISTS 'TEST';

ALTER TABLE "PushDeliveryOutbox" ADD COLUMN "targetSubscriptionId" TEXT;
ALTER TABLE "PushDeliveryOutbox" ADD COLUMN "targetSubscriptionVersion" INTEGER;

ALTER TABLE "BrowserPushSubscription" ADD COLUMN "registrationVersion" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "PushDeliveryOutbox_targetSubscriptionId_status_idx"
  ON "PushDeliveryOutbox"("targetSubscriptionId", "status");
