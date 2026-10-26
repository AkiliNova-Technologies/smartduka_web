-- Publish the approved three-plan catalog for new sales. Historical BUSINESS
-- subscriptions keep their plan relation; only the legacy plan is hidden from
-- the active catalog.
UPDATE "SubscriptionPlan"
SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'BUSINESS';

INSERT INTO "SubscriptionPlan" (
  "id", "name", "slug", "code", "description", "price", "currency",
  "billingCycle", "maxProducts", "commissionRate", "staffSeats", "features",
  "sortOrder", "isActive", "createdAt", "updatedAt"
)
VALUES
  (gen_random_uuid()::text, 'Starter', 'starter', 'STARTER', 'Essential tools for running a Mwezora shop.', 25000, 'UGX', 'MONTHLY', 100, 0, 2, '["BASIC_ANALYTICS","STANDARD_INVENTORY","PRODUCT_MANAGEMENT","BRANCH_MANAGEMENT","TEAM_MANAGEMENT","ADVERTISING_ACCESS"]'::jsonb, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Growth', 'growth', 'GROWTH', 'Advanced tools for growing shops.', 60000, 'UGX', 'MONTHLY', 1000, 0, 10, '["BASIC_ANALYTICS","ADVANCED_ANALYTICS","STANDARD_INVENTORY","CSV_EXPORTS","PRODUCT_MANAGEMENT","BRANCH_MANAGEMENT","TEAM_MANAGEMENT","ADVERTISING_ACCESS"]'::jsonb, 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Premium', 'premium', 'PREMIUM', 'Premium insights and multi-branch operations.', 120000, 'UGX', 'MONTHLY', NULL, 0, 30, '["BASIC_ANALYTICS","ADVANCED_ANALYTICS","PREMIUM_INSIGHTS","STANDARD_INVENTORY","ADVANCED_INVENTORY","CSV_EXPORTS","PRODUCT_MANAGEMENT","BRANCH_MANAGEMENT","TEAM_MANAGEMENT","ADVERTISING_ACCESS"]'::jsonb, 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "currency" = EXCLUDED."currency",
  "billingCycle" = EXCLUDED."billingCycle",
  "maxProducts" = EXCLUDED."maxProducts",
  "commissionRate" = EXCLUDED."commissionRate",
  "staffSeats" = EXCLUDED."staffSeats",
  "features" = EXCLUDED."features",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "SubscriptionPlanVersion" (
  "id", "planId", "planCode", "version", "policyVersion",
  "monthlyPriceUgx", "billingCycle", "activeProductLimit",
  "productSafetyCeiling", "branchLimit", "staffLimit", "capabilities",
  "effectiveAt", "publicationStatus", "publishedAt", "createdAt"
)
SELECT
  gen_random_uuid()::text, plan."id", policy."planCode", 1,
  'MWEZORA_REVENUE_V1', policy."price", 'MONTHLY'::"BillingCycle",
  policy."productLimit", policy."safetyCeiling", policy."branchLimit",
  policy."staffLimit", policy."capabilities", CURRENT_TIMESTAMP,
  'PUBLISHED'::"SubscriptionPlanPublicationStatus", CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (VALUES
  ('STARTER', 25000::numeric, 100, NULL::integer, 1, 2, ARRAY['BASIC_ANALYTICS','STANDARD_INVENTORY','PRODUCT_MANAGEMENT','BRANCH_MANAGEMENT','TEAM_MANAGEMENT','ADVERTISING_ACCESS']::text[]),
  ('GROWTH', 60000::numeric, 1000, NULL::integer, 5, 10, ARRAY['BASIC_ANALYTICS','ADVANCED_ANALYTICS','STANDARD_INVENTORY','CSV_EXPORTS','PRODUCT_MANAGEMENT','BRANCH_MANAGEMENT','TEAM_MANAGEMENT','ADVERTISING_ACCESS']::text[]),
  ('PREMIUM', 120000::numeric, NULL::integer, 10000, 20, 30, ARRAY['BASIC_ANALYTICS','ADVANCED_ANALYTICS','PREMIUM_INSIGHTS','STANDARD_INVENTORY','ADVANCED_INVENTORY','CSV_EXPORTS','PRODUCT_MANAGEMENT','BRANCH_MANAGEMENT','TEAM_MANAGEMENT','ADVERTISING_ACCESS']::text[])
) AS policy("planCode", "price", "productLimit", "safetyCeiling", "branchLimit", "staffLimit", "capabilities")
JOIN "SubscriptionPlan" plan ON plan."code" = policy."planCode"
ON CONFLICT ("planCode", "version") DO NOTHING;
