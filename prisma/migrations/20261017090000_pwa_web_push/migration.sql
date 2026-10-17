CREATE TYPE "BrowserPushSubscriptionStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "PushDeliveryKind" AS ENUM ('TRANSACTIONAL', 'ANNOUNCEMENT', 'MARKETING');
CREATE TYPE "PushDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRYING', 'DELIVERED', 'SKIPPED', 'FAILED');

ALTER TABLE "UserSettings" ADD COLUMN "promotionalPushNotifications" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "BrowserPushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpointHash" VARCHAR(64) NOT NULL,
  "endpointEncrypted" TEXT NOT NULL,
  "p256dhEncrypted" TEXT NOT NULL,
  "authEncrypted" TEXT NOT NULL,
  "userAgent" VARCHAR(512),
  "deviceName" VARCHAR(120),
  "status" "BrowserPushSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrowserPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushDeliveryOutbox" (
  "id" TEXT NOT NULL,
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "userId" TEXT NOT NULL,
  "notificationId" TEXT,
  "kind" "PushDeliveryKind" NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "message" VARCHAR(1000) NOT NULL,
  "actionPath" VARCHAR(500),
  "status" "PushDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lockToken" VARCHAR(80),
  "deliveredAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "failureCode" VARCHAR(80),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushDeliveryOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrowserPushSubscription_endpointHash_key" ON "BrowserPushSubscription"("endpointHash");
CREATE INDEX "BrowserPushSubscription_userId_status_idx" ON "BrowserPushSubscription"("userId", "status");
CREATE INDEX "BrowserPushSubscription_status_updatedAt_idx" ON "BrowserPushSubscription"("status", "updatedAt");
CREATE UNIQUE INDEX "PushDeliveryOutbox_idempotencyKey_key" ON "PushDeliveryOutbox"("idempotencyKey");
CREATE UNIQUE INDEX "PushDeliveryOutbox_notificationId_key" ON "PushDeliveryOutbox"("notificationId");
CREATE INDEX "PushDeliveryOutbox_status_nextAttemptAt_idx" ON "PushDeliveryOutbox"("status", "nextAttemptAt");
CREATE INDEX "PushDeliveryOutbox_userId_status_idx" ON "PushDeliveryOutbox"("userId", "status");
ALTER TABLE "BrowserPushSubscription" ADD CONSTRAINT "BrowserPushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushDeliveryOutbox" ADD CONSTRAINT "PushDeliveryOutbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushDeliveryOutbox" ADD CONSTRAINT "PushDeliveryOutbox_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
