CREATE TYPE "MarketingNotificationCategory" AS ENUM ('OFFERS', 'NEW_ARRIVALS', 'RECOMMENDATIONS', 'SEASONAL');
CREATE TYPE "MarketingNotificationAudience" AS ENUM ('PROMOTIONAL_OPT_IN', 'RECOMMENDATIONS_OPT_IN');
CREATE TYPE "MarketingDestinationType" AS ENUM ('HOME', 'PRODUCT', 'SHOP', 'CATEGORY', 'FEATURED_SECTION');

ALTER TABLE "UserSettings" ADD COLUMN "promotionalInAppNotifications" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserSettings" ADD COLUMN "shoppingRecommendations" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "MarketingNotificationCampaign" (
  "id" TEXT NOT NULL, "name" VARCHAR(160) NOT NULL, "title" VARCHAR(160) NOT NULL,
  "message" VARCHAR(2000) NOT NULL, "category" "MarketingNotificationCategory" NOT NULL,
  "audience" "MarketingNotificationAudience" NOT NULL, "destinationType" "MarketingDestinationType" NOT NULL,
  "destinationReference" VARCHAR(191), "destinationPath" VARCHAR(500) NOT NULL,
  "imageUrl" VARCHAR(1000), "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduledAt" TIMESTAMP(3), "publishedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL, "publishedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "MarketingNotificationCampaign_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MarketingNotificationUserState" (
  "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "readAt" TIMESTAMP(3), "dismissedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingNotificationUserState_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MarketingNotificationCampaign_status_scheduledAt_idx" ON "MarketingNotificationCampaign"("status", "scheduledAt");
CREATE INDEX "MarketingNotificationCampaign_status_publishedAt_expiresAt_idx" ON "MarketingNotificationCampaign"("status", "publishedAt", "expiresAt");
CREATE INDEX "MarketingNotificationCampaign_audience_status_publishedAt_idx" ON "MarketingNotificationCampaign"("audience", "status", "publishedAt");
CREATE INDEX "MarketingNotificationCampaign_destinationType_destinationReference_idx" ON "MarketingNotificationCampaign"("destinationType", "destinationReference");
CREATE UNIQUE INDEX "MarketingNotificationUserState_campaignId_userId_key" ON "MarketingNotificationUserState"("campaignId", "userId");
CREATE INDEX "MarketingNotificationUserState_userId_deliveredAt_idx" ON "MarketingNotificationUserState"("userId", "deliveredAt");
CREATE INDEX "MarketingNotificationUserState_userId_readAt_idx" ON "MarketingNotificationUserState"("userId", "readAt");
CREATE INDEX "MarketingNotificationUserState_userId_dismissedAt_idx" ON "MarketingNotificationUserState"("userId", "dismissedAt");
ALTER TABLE "MarketingNotificationCampaign" ADD CONSTRAINT "MarketingNotificationCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketingNotificationCampaign" ADD CONSTRAINT "MarketingNotificationCampaign_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingNotificationUserState" ADD CONSTRAINT "MarketingNotificationUserState_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingNotificationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingNotificationUserState" ADD CONSTRAINT "MarketingNotificationUserState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
