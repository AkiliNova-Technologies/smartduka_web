# Migration and compatibility plan

No migration is authorized in R1. This is the proposed safe path.

## Inventory before change

Produce read-only counts grouped by:

- Existing plan code/version/active flag and prices.
- Subscription status/period, overlapping periods and linked platform orders/intents.
- Trial start/end and whether vendor has ever paid.
- Promotion credit balance, expired entries, grant/release keys and campaigns.
- Vendors with no subscription and their verification/shop status.
- Active product, active branch and delegated-staff counts per vendor.
- Branch-inventory usage and analytics/export feature use.

Do not infer eligibility from counts alone; retain an export/hash of the migration decision set for review.

## Plan mapping

- Existing `STARTER` remains Starter, but purchases after cutover reference the new published plan version.
- Existing `BUSINESS` maps commercially to `GROWTH` at UGX 60,000. Keep the old plan row/code inactive for history or store an alias; do not rewrite old subscription snapshots to pretend they were Growth.
- Add Premium at UGX 120,000 as a new published version.
- Existing 25,000 and 60,000 prices match the confirmed Starter/Growth prices (`scripts/seed-subscription-plans.mjs:6-10`).

## Existing subscriptions and billing records

- Preserve every `VendorSubscription`, `PlatformRevenueOrder` and `PlatformPaymentIntent` ID/status/amount.
- Backfill a commercial snapshot from the plan values effective at migration time, flagging ambiguous records for review.
- Do not alter paid period start/end.
- Detect overlapping active/future periods before adding an invariant; resolve through an reviewed mapping table, not deletion.
- Pending/review-required intents remain on their original commercial terms.

## Existing trials

The earlier migration granted active shops 30 days (`prisma/migrations/20261009090000_platform_revenue_engine_phase1/migration.sql:9-11`). R2A backfills those timestamps into `VendorTrial` without changing them. Apply the approved 14-day policy only to newly activated trials after cutover.

## Existing credits

- Preserve welcome grants and all redemption/release entries.
- Do not relabel a welcome credit as a subscription benefit.
- Establish subscription-period grant keys only for periods effective after benefit launch unless product explicitly approves a one-time backfill.
- Reconcile negative/expired/ambiguous balances before enforcing a new benefit.

## Over-limit legacy vendors

Recommended non-destructive transition:

1. Calculate proposed plan fit from current products, branches, staff and branch-inventory use.
2. Notify vendor and administrator of the proposed tier and over-limit dimensions.
3. Provide the approved 30-day transition window after a future notification; R2A neither starts it nor sends notifications.
4. Block only quota-increasing actions after enforcement date.
5. Never auto-delete, unpublish, remove staff or disable branch inventory.
6. Permit upgrade or voluntary reduction; administrative exception is time-bounded and audited.

Vendors with no subscription enter trial only if eligible under the new policy. Otherwise they enter `LIMITED`; there is no implicit free package.

## Deployment stages

- Add schema/config support with enforcement disabled.
- Backfill snapshots/aliases and run consistency reports.
- Deploy entitlement evaluation in shadow mode and compare decisions with current behavior.
- Expose usage/upgrade messages.
- Enable one quota at a time behind server-side rollout flags, beginning with staff (closest to existing enforcement), then products, branches and feature gates.
- Run scheduler/payment/credit reconciliation after every stage; maintain a rollback that disables new enforcement without reverting historical writes.

## Compatibility

Mobile/web clients continue consuming a versioned entitlement DTO. Unknown capabilities must be ignored by older clients. Server denial codes remain stable. Existing order, product, branch and staff APIs may add structured quota errors but cannot silently change successful read/maintenance operations.
