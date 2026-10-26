CREATE TYPE "SubscriptionPlanPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
CREATE TYPE "VendorTrialStatus" AS ENUM ('ELIGIBLE', 'ACTIVE', 'EXPIRED', 'INELIGIBLE', 'CANCELLED');

CREATE TABLE "SubscriptionPlanVersion" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "planCode" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "monthlyPriceUgx" DECIMAL(18,2) NOT NULL,
  "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
  "activeProductLimit" INTEGER,
  "productSafetyCeiling" INTEGER,
  "branchLimit" INTEGER NOT NULL,
  "staffLimit" INTEGER NOT NULL,
  "capabilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "publicationStatus" "SubscriptionPlanPublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionPlanVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionPlanVersion_positive_version_check" CHECK ("version" > 0),
  CONSTRAINT "SubscriptionPlanVersion_price_check" CHECK ("monthlyPriceUgx" >= 0),
  CONSTRAINT "SubscriptionPlanVersion_product_limit_check" CHECK ("activeProductLimit" IS NULL OR "activeProductLimit" >= 0),
  CONSTRAINT "SubscriptionPlanVersion_product_ceiling_check" CHECK ("productSafetyCeiling" IS NULL OR "productSafetyCeiling" > 0),
  CONSTRAINT "SubscriptionPlanVersion_branch_limit_check" CHECK ("branchLimit" >= 0),
  CONSTRAINT "SubscriptionPlanVersion_staff_limit_check" CHECK ("staffLimit" >= 0),
  CONSTRAINT "SubscriptionPlanVersion_published_at_check" CHECK ("publicationStatus" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL),
  CONSTRAINT "SubscriptionPlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SubscriptionPlanVersion_planCode_version_key" ON "SubscriptionPlanVersion"("planCode", "version");
CREATE INDEX "SubscriptionPlanVersion_planId_publicationStatus_effectiveAt_idx" ON "SubscriptionPlanVersion"("planId", "publicationStatus", "effectiveAt");
CREATE INDEX "SubscriptionPlanVersion_policyVersion_publicationStatus_idx" ON "SubscriptionPlanVersion"("policyVersion", "publicationStatus");

ALTER TABLE "VendorSubscription" ADD COLUMN "planVersionId" TEXT;
ALTER TABLE "VendorSubscription" ADD CONSTRAINT "VendorSubscription_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "SubscriptionPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "VendorSubscription_planVersionId_idx" ON "VendorSubscription"("planVersionId");
CREATE INDEX "VendorSubscription_vendorId_status_currentPeriodEnd_idx" ON "VendorSubscription"("vendorId", "status", "currentPeriodEnd");

CREATE TABLE "VendorTrial" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "status" "VendorTrialStatus" NOT NULL,
  "eligible" BOOLEAN NOT NULL,
  "eligibilityDeterminedAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "policyVersion" TEXT NOT NULL,
  "activationKey" TEXT,
  "administrativeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VendorTrial_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VendorTrial_window_check" CHECK ("expiresAt" IS NULL OR "activatedAt" IS NULL OR "expiresAt" > "activatedAt"),
  CONSTRAINT "VendorTrial_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VendorTrial_vendorId_key" ON "VendorTrial"("vendorId");
CREATE UNIQUE INDEX "VendorTrial_activationKey_key" ON "VendorTrial"("activationKey");
CREATE INDEX "VendorTrial_status_expiresAt_idx" ON "VendorTrial"("status", "expiresAt");

CREATE TABLE "VendorTrialExtension" (
  "id" TEXT NOT NULL,
  "trialId" TEXT NOT NULL,
  "previousExpiresAt" TIMESTAMP(3) NOT NULL,
  "newExpiresAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "extendedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorTrialExtension_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VendorTrialExtension_window_check" CHECK ("newExpiresAt" > "previousExpiresAt"),
  CONSTRAINT "VendorTrialExtension_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "VendorTrial"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "VendorTrialExtension_extendedById_fkey" FOREIGN KEY ("extendedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "VendorTrialExtension_trialId_createdAt_idx" ON "VendorTrialExtension"("trialId", "createdAt");
CREATE INDEX "VendorTrialExtension_extendedById_idx" ON "VendorTrialExtension"("extendedById");

-- Preserve legacy trial timestamps exactly. No new trial is activated here.
INSERT INTO "VendorTrial" (
  "id", "vendorId", "status", "eligible", "eligibilityDeterminedAt",
  "activatedAt", "expiresAt", "policyVersion", "administrativeReason", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  "id",
  CASE WHEN "trialEndsAt" > CURRENT_TIMESTAMP THEN 'ACTIVE'::"VendorTrialStatus" ELSE 'EXPIRED'::"VendorTrialStatus" END,
  true,
  COALESCE("trialStartedAt", "createdAt"),
  "trialStartedAt",
  "trialEndsAt",
  'LEGACY_TRIAL_V0',
  'Backfilled from authoritative legacy VendorProfile trial timestamps.',
  CURRENT_TIMESTAMP
FROM "VendorProfile"
WHERE "trialEndsAt" IS NOT NULL
ON CONFLICT ("vendorId") DO NOTHING;
