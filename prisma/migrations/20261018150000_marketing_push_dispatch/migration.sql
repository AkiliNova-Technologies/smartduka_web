ALTER TABLE "MarketingNotificationCampaign"
  ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PushDeliveryOutbox"
  ADD COLUMN "marketingCampaignId" TEXT;

CREATE TABLE "MarketingPushDispatch" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "status" "AnnouncementPushDispatchStatus" NOT NULL DEFAULT 'PENDING',
  "cursorUserId" TEXT,
  "processedRecipients" INTEGER NOT NULL DEFAULT 0,
  "eligibleRecipients" INTEGER NOT NULL DEFAULT 0,
  "queuedJobs" INTEGER NOT NULL DEFAULT 0,
  "lockedAt" TIMESTAMP(3),
  "lockToken" VARCHAR(80),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingPushDispatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingPushDispatch_campaignId_key" ON "MarketingPushDispatch"("campaignId");
CREATE INDEX "MarketingPushDispatch_status_updatedAt_idx" ON "MarketingPushDispatch"("status", "updatedAt");
CREATE UNIQUE INDEX "PushDeliveryOutbox_marketingCampaignId_targetSubscriptionId_key" ON "PushDeliveryOutbox"("marketingCampaignId", "targetSubscriptionId");

ALTER TABLE "MarketingPushDispatch" ADD CONSTRAINT "MarketingPushDispatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingNotificationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushDeliveryOutbox" ADD CONSTRAINT "PushDeliveryOutbox_marketingCampaignId_fkey" FOREIGN KEY ("marketingCampaignId") REFERENCES "MarketingNotificationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
