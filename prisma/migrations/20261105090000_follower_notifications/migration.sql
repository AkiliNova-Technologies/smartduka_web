CREATE TYPE "StorePublicationTopic" AS ENUM ('ANNOUNCEMENT', 'CAMPAIGN', 'NEW_ARRIVALS');

ALTER TABLE "UserSettings"
  ADD COLUMN "followedStoreAnnouncements" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "followedStoreCampaigns" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "followedStoreNewArrivals" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "StorePublication" ADD COLUMN "notificationTopic" "StorePublicationTopic";
UPDATE "StorePublication" SET "notificationTopic" = CASE
  WHEN "kind" = 'ANNOUNCEMENT' THEN 'ANNOUNCEMENT'::"StorePublicationTopic"
  ELSE 'CAMPAIGN'::"StorePublicationTopic"
END;
ALTER TABLE "StorePublication" ALTER COLUMN "notificationTopic" SET NOT NULL;

ALTER TABLE "Notification"
  ADD COLUMN "imageUrl" VARCHAR(1000),
  ADD COLUMN "storePublicationEventId" TEXT;

ALTER TABLE "PushDeliveryOutbox" ADD COLUMN "storePublicationEventId" TEXT;

CREATE TABLE "StorePublicationDispatch" (
  "id" TEXT NOT NULL,
  "publicationEventId" TEXT NOT NULL,
  "status" "PushDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "cursorFollowId" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "processedRecipients" INTEGER NOT NULL DEFAULT 0,
  "createdNotifications" INTEGER NOT NULL DEFAULT 0,
  "queuedPushJobs" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lockToken" VARCHAR(80),
  "lastFailureAt" TIMESTAMP(3),
  "failureCode" VARCHAR(80),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorePublicationDispatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorePublicationDispatch_publicationEventId_key" ON "StorePublicationDispatch"("publicationEventId");
CREATE INDEX "StorePublicationDispatch_status_nextAttemptAt_idx" ON "StorePublicationDispatch"("status", "nextAttemptAt");
CREATE INDEX "Notification_storePublicationEventId_userId_idx" ON "Notification"("storePublicationEventId", "userId");
CREATE UNIQUE INDEX "PushDeliveryOutbox_storePublicationEventId_userId_key" ON "PushDeliveryOutbox"("storePublicationEventId", "userId");

ALTER TABLE "StorePublicationDispatch" ADD CONSTRAINT "StorePublicationDispatch_publicationEventId_fkey" FOREIGN KEY ("publicationEventId") REFERENCES "StorePublicationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_storePublicationEventId_fkey" FOREIGN KEY ("storePublicationEventId") REFERENCES "StorePublicationEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PushDeliveryOutbox" ADD CONSTRAINT "PushDeliveryOutbox_storePublicationEventId_fkey" FOREIGN KEY ("storePublicationEventId") REFERENCES "StorePublicationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The event records become content-eligible, but processing and external push
-- remain disabled unless their independent runtime rollout gates are enabled.
UPDATE "StorePublicationEvent" SET
  "notificationEligible" = true,
  "eligibilityMetadata" = jsonb_set(
    jsonb_set("eligibilityMetadata", '{deliveryEnabled}', 'false'::jsonb, true),
    '{requiresMarketingConsent}', 'true'::jsonb, true
  );
