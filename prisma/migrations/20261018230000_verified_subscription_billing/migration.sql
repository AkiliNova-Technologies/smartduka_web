CREATE TYPE "SubscriptionBillingPurpose" AS ENUM ('INITIAL_SUBSCRIPTION', 'RENEWAL', 'SCHEDULED_PLAN_CHANGE');
CREATE TYPE "SubscriptionPaidPeriodStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED', 'REVIEW_REQUIRED');

CREATE TABLE "SubscriptionBillingIntent" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "lifecycleIntentId" TEXT,
  "planVersionId" TEXT NOT NULL,
  "revenueOrderId" TEXT NOT NULL,
  "purpose" "SubscriptionBillingPurpose" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'UGX',
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "merchantDestinationHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "activatedAt" TIMESTAMPTZ,
  "reviewReason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "SubscriptionBillingIntent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionBillingIntent_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "SubscriptionBillingIntent_currency_check" CHECK ("currency" = 'UGX'),
  CONSTRAINT "SubscriptionBillingIntent_expiry_check" CHECK ("expiresAt" > "createdAt")
);

CREATE TABLE "SubscriptionPaidPeriod" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "billingIntentId" TEXT NOT NULL,
  "paymentIntentId" TEXT NOT NULL,
  "planVersionId" TEXT NOT NULL,
  "status" "SubscriptionPaidPeriodStatus" NOT NULL,
  "periodStart" TIMESTAMPTZ NOT NULL,
  "periodEnd" TIMESTAMPTZ NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "activatedAt" TIMESTAMPTZ,
  "endedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "SubscriptionPaidPeriod_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionPaidPeriod_bounds_check" CHECK ("periodEnd" > "periodStart"),
  CONSTRAINT "SubscriptionPaidPeriod_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "SubscriptionPaidPeriod_currency_check" CHECK ("currency" = 'UGX')
);

CREATE INDEX "SubscriptionBillingIntent_lifecycleIntentId_createdAt_idx" ON "SubscriptionBillingIntent"("lifecycleIntentId", "createdAt");
CREATE UNIQUE INDEX "SubscriptionBillingIntent_revenueOrderId_key" ON "SubscriptionBillingIntent"("revenueOrderId");
CREATE UNIQUE INDEX "SubscriptionBillingIntent_vendorId_idempotencyKey_key" ON "SubscriptionBillingIntent"("vendorId", "idempotencyKey");
CREATE INDEX "SubscriptionBillingIntent_vendorId_purpose_expiresAt_idx" ON "SubscriptionBillingIntent"("vendorId", "purpose", "expiresAt");
CREATE INDEX "SubscriptionBillingIntent_subscriptionId_createdAt_idx" ON "SubscriptionBillingIntent"("subscriptionId", "createdAt");
CREATE INDEX "SubscriptionBillingIntent_planVersionId_idx" ON "SubscriptionBillingIntent"("planVersionId");
CREATE UNIQUE INDEX "SubscriptionPaidPeriod_billingIntentId_key" ON "SubscriptionPaidPeriod"("billingIntentId");
CREATE UNIQUE INDEX "SubscriptionPaidPeriod_paymentIntentId_key" ON "SubscriptionPaidPeriod"("paymentIntentId");
CREATE UNIQUE INDEX "SubscriptionPaidPeriod_subscriptionId_periodStart_key" ON "SubscriptionPaidPeriod"("subscriptionId", "periodStart");
CREATE INDEX "SubscriptionPaidPeriod_vendorId_status_periodStart_idx" ON "SubscriptionPaidPeriod"("vendorId", "status", "periodStart");
CREATE INDEX "SubscriptionPaidPeriod_subscriptionId_periodEnd_idx" ON "SubscriptionPaidPeriod"("subscriptionId", "periodEnd");

ALTER TABLE "SubscriptionBillingIntent" ADD CONSTRAINT "SubscriptionBillingIntent_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionBillingIntent" ADD CONSTRAINT "SubscriptionBillingIntent_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionBillingIntent" ADD CONSTRAINT "SubscriptionBillingIntent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "VendorSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionBillingIntent" ADD CONSTRAINT "SubscriptionBillingIntent_lifecycleIntentId_fkey" FOREIGN KEY ("lifecycleIntentId") REFERENCES "SubscriptionLifecycleIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionBillingIntent" ADD CONSTRAINT "SubscriptionBillingIntent_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "SubscriptionPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionBillingIntent" ADD CONSTRAINT "SubscriptionBillingIntent_revenueOrderId_fkey" FOREIGN KEY ("revenueOrderId") REFERENCES "PlatformRevenueOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPaidPeriod" ADD CONSTRAINT "SubscriptionPaidPeriod_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPaidPeriod" ADD CONSTRAINT "SubscriptionPaidPeriod_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "VendorSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPaidPeriod" ADD CONSTRAINT "SubscriptionPaidPeriod_billingIntentId_fkey" FOREIGN KEY ("billingIntentId") REFERENCES "SubscriptionBillingIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPaidPeriod" ADD CONSTRAINT "SubscriptionPaidPeriod_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PlatformPaymentIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPaidPeriod" ADD CONSTRAINT "SubscriptionPaidPeriod_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "SubscriptionPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
