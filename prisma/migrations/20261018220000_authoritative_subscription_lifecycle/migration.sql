CREATE TYPE "SubscriptionLifecycleIntentType" AS ENUM ('RENEWAL', 'UPGRADE', 'DOWNGRADE');
CREATE TYPE "SubscriptionLifecycleIntentStatus" AS ENUM ('PENDING', 'CANCELLED', 'APPLIED', 'EXPIRED');

CREATE TABLE "SubscriptionLifecycleIntent" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "type" "SubscriptionLifecycleIntentType" NOT NULL,
  "status" "SubscriptionLifecycleIntentStatus" NOT NULL DEFAULT 'PENDING',
  "requestedPlanId" TEXT,
  "requestedPlanVersionId" TEXT,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "requestedById" TEXT NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionLifecycleIntent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionLifecycleIntent_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SubscriptionLifecycleIntent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "VendorSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SubscriptionLifecycleIntent_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SubscriptionLifecycleIntent_effective_at_check" CHECK ("effectiveAt" >= "createdAt"),
  CONSTRAINT "SubscriptionLifecycleIntent_plan_change_check" CHECK (("type" = 'RENEWAL') OR ("requestedPlanId" IS NOT NULL AND "requestedPlanVersionId" IS NOT NULL))
);
CREATE UNIQUE INDEX "SubscriptionLifecycleIntent_vendorId_idempotencyKey_key" ON "SubscriptionLifecycleIntent"("vendorId", "idempotencyKey");
CREATE INDEX "SubscriptionLifecycleIntent_vendorId_status_effectiveAt_idx" ON "SubscriptionLifecycleIntent"("vendorId", "status", "effectiveAt");
CREATE INDEX "SubscriptionLifecycleIntent_subscriptionId_status_idx" ON "SubscriptionLifecycleIntent"("subscriptionId", "status");
CREATE INDEX "SubscriptionLifecycleIntent_requestedPlanId_idx" ON "SubscriptionLifecycleIntent"("requestedPlanId");
CREATE INDEX "SubscriptionLifecycleIntent_requestedPlanVersionId_idx" ON "SubscriptionLifecycleIntent"("requestedPlanVersionId");
CREATE UNIQUE INDEX "SubscriptionLifecycleIntent_one_pending_change_per_vendor"
  ON "SubscriptionLifecycleIntent"("vendorId")
  WHERE "status" = 'PENDING' AND "type" IN ('UPGRADE', 'DOWNGRADE');
CREATE UNIQUE INDEX "SubscriptionLifecycleIntent_one_pending_renewal_per_subscription"
  ON "SubscriptionLifecycleIntent"("subscriptionId")
  WHERE "status" = 'PENDING' AND "type" = 'RENEWAL';
