-- Add interval-aware subscription billing without changing historical amounts
-- or period dates. Existing subscriptions and paid periods remain monthly.
ALTER TABLE "SubscriptionPlanVersion"
  ADD COLUMN "yearlyPriceUgx" DECIMAL(18,2);

ALTER TABLE "VendorSubscription"
  ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY';

ALTER TABLE "SubscriptionBillingIntent"
  ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY';

ALTER TABLE "SubscriptionPaidPeriod"
  ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY';

ALTER TABLE "SubscriptionLifecycleIntent"
  ADD COLUMN "requestedBillingCycle" "BillingCycle";

-- Only active, unexpired introductory trials are extended. The new expiry is
-- calculated from the original activation date; expired trials are untouched.
UPDATE "VendorTrial"
SET
  "expiresAt" = "activatedAt" + INTERVAL '30 days',
  "policyVersion" = 'MEZORA_REVENUE_V2',
  "updatedAt" = NOW()
WHERE "status" = 'ACTIVE'
  AND "activatedAt" IS NOT NULL
  AND "expiresAt" > NOW()
  AND "expiresAt" < "activatedAt" + INTERVAL '30 days';

UPDATE "VendorProfile" AS vendor
SET "trialEndsAt" = trial."expiresAt"
FROM "VendorTrial" AS trial
WHERE trial."vendorId" = vendor."id"
  AND trial."status" = 'ACTIVE'
  AND trial."expiresAt" > NOW()
  AND vendor."trialEndsAt" IS DISTINCT FROM trial."expiresAt";
