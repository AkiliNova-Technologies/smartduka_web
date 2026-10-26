-- MANUAL RECOVERY ONLY. Do not run through normal application startup.
-- Preconditions verified on 2026-10-18:
--   * the failed migration has applied_steps_count = 0
--   * both partial R3B tables exist and contain zero rows
--   * no R3B foreign keys exist
-- Run only after a fresh read-only preflight confirms those facts again.

BEGIN;

LOCK TABLE "SubscriptionBillingIntent" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "SubscriptionPaidPeriod" IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "SubscriptionBillingIntent" LIMIT 1)
     OR EXISTS (SELECT 1 FROM "SubscriptionPaidPeriod" LIMIT 1) THEN
    RAISE EXCEPTION 'R3B recovery refused: partial billing tables are not empty';
  END IF;
END
$$;

ALTER TABLE "SubscriptionBillingIntent"
  ALTER COLUMN "id" TYPE TEXT USING "id"::text,
  ALTER COLUMN "vendorId" TYPE TEXT USING "vendorId"::text,
  ALTER COLUMN "requestedById" TYPE TEXT USING "requestedById"::text,
  ALTER COLUMN "subscriptionId" TYPE TEXT USING "subscriptionId"::text,
  ALTER COLUMN "lifecycleIntentId" TYPE TEXT USING "lifecycleIntentId"::text,
  ALTER COLUMN "planVersionId" TYPE TEXT USING "planVersionId"::text,
  ALTER COLUMN "revenueOrderId" TYPE TEXT USING "revenueOrderId"::text;

ALTER TABLE "SubscriptionPaidPeriod"
  ALTER COLUMN "id" TYPE TEXT USING "id"::text,
  ALTER COLUMN "vendorId" TYPE TEXT USING "vendorId"::text,
  ALTER COLUMN "subscriptionId" TYPE TEXT USING "subscriptionId"::text,
  ALTER COLUMN "billingIntentId" TYPE TEXT USING "billingIntentId"::text,
  ALTER COLUMN "paymentIntentId" TYPE TEXT USING "paymentIntentId"::text,
  ALTER COLUMN "planVersionId" TYPE TEXT USING "planVersionId"::text;

DROP INDEX "SubscriptionBillingIntent_lifecycleIntentId_key";
CREATE INDEX "SubscriptionBillingIntent_lifecycleIntentId_createdAt_idx"
  ON "SubscriptionBillingIntent"("lifecycleIntentId", "createdAt");

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

COMMIT;
