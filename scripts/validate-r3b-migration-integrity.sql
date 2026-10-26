DO $$
DECLARE
  text_columns integer;
  billing_fks integer;
  billing_indexes integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_attribute child ON child.attrelid = c.conrelid AND child.attnum = ANY(c.conkey)
    JOIN pg_attribute parent ON parent.attrelid = c.confrelid AND parent.attnum = ANY(c.confkey)
    WHERE c.contype = 'f' AND child.atttypid <> parent.atttypid
  ) THEN RAISE EXCEPTION 'Foreign-key column type mismatch detected'; END IF;

  IF EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL)
  THEN RAISE EXCEPTION 'Incomplete migration detected'; END IF;

  SELECT count(*) INTO text_columns FROM information_schema.columns
  WHERE table_schema = 'public' AND data_type = 'text'
    AND (table_name, column_name) IN (
      ('SubscriptionBillingIntent','id'), ('SubscriptionBillingIntent','vendorId'),
      ('SubscriptionBillingIntent','requestedById'), ('SubscriptionBillingIntent','subscriptionId'),
      ('SubscriptionBillingIntent','lifecycleIntentId'), ('SubscriptionBillingIntent','planVersionId'),
      ('SubscriptionBillingIntent','revenueOrderId'), ('SubscriptionPaidPeriod','id'),
      ('SubscriptionPaidPeriod','vendorId'), ('SubscriptionPaidPeriod','subscriptionId'),
      ('SubscriptionPaidPeriod','billingIntentId'), ('SubscriptionPaidPeriod','paymentIntentId'),
      ('SubscriptionPaidPeriod','planVersionId')
    );
  IF text_columns <> 13 THEN RAISE EXCEPTION 'R3B schema drift: expected 13 TEXT identifier columns, found %', text_columns; END IF;

  SELECT count(*) INTO billing_fks FROM pg_constraint
  WHERE contype = 'f' AND conrelid IN ('"SubscriptionBillingIntent"'::regclass, '"SubscriptionPaidPeriod"'::regclass);
  IF billing_fks <> 11 THEN RAISE EXCEPTION 'R3B schema drift: expected 11 foreign keys, found %', billing_fks; END IF;

  SELECT count(*) INTO billing_indexes FROM pg_indexes
  WHERE schemaname = 'public' AND indexname IN (
    'SubscriptionBillingIntent_lifecycleIntentId_createdAt_idx', 'SubscriptionBillingIntent_revenueOrderId_key',
    'SubscriptionBillingIntent_vendorId_idempotencyKey_key', 'SubscriptionBillingIntent_vendorId_purpose_expiresAt_idx',
    'SubscriptionBillingIntent_subscriptionId_createdAt_idx', 'SubscriptionBillingIntent_planVersionId_idx',
    'SubscriptionPaidPeriod_billingIntentId_key', 'SubscriptionPaidPeriod_paymentIntentId_key',
    'SubscriptionPaidPeriod_subscriptionId_periodStart_key', 'SubscriptionPaidPeriod_vendorId_status_periodStart_idx',
    'SubscriptionPaidPeriod_subscriptionId_periodEnd_idx'
  );
  IF billing_indexes <> 11 THEN RAISE EXCEPTION 'R3B schema drift: expected 11 billing indexes, found %', billing_indexes; END IF;

  IF to_regclass('public."SubscriptionBillingIntent_lifecycleIntentId_key"') IS NOT NULL
  THEN RAISE EXCEPTION 'R3B schema drift: obsolete lifecycle-intent index exists'; END IF;
END $$;
