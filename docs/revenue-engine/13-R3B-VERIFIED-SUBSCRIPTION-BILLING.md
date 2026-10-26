# R3B — Verified subscription billing

Status: implemented against the existing platform-revenue and MTN collection boundary. Production payment access and mandatory production subscription enforcement remain disabled.

## Existing architecture and domain separation

Mwezora already has two deliberately separate payment domains. Marketplace `PaymentIntent` records represent customer purchases routed to verified vendor merchant accounts. `PlatformRevenueOrder` and `PlatformPaymentIntent` represent vendor-to-Mwezora revenue, including subscriptions. R3B reuses the second domain and does not read or mutate customer settlement records, introduce commissions, or share provider intents between domains.

The flow is: owner creates a server-priced subscription revenue order and `SubscriptionBillingIntent`; the existing `PlatformPaymentService` persists a platform intent before making an MTN sandbox RequestToPay; HTTP 202 is stored as `PENDING`; the existing reconciliation worker polls through platform MTN credentials; only a trusted final `SUCCESSFUL` observation can atomically create a `SubscriptionPaidPeriod` and activate or schedule access.

## Billing intent lifecycle

Each billing intent binds the vendor, requesting owner, existing or initial subscription, immutable published plan version, server-derived UGX amount, purpose, idempotency key, revenue order, optional R3A lifecycle intent, expiry and a hash of the configured platform merchant destination. Supported purposes are `INITIAL_SUBSCRIPTION`, `RENEWAL`, and `SCHEDULED_PLAN_CHANGE`.

The browser supplies a plan code and optional lifecycle-intent identifier, never a price. The service resolves the immutable published version and checks active shop status, approved onboarding, verified shop status, owner authority, tenant ownership and platform merchant configuration. Initial billing is rejected when effective paid access already exists; renewals and plan changes must bind to a pending vendor-scoped R3A intent.

Payment initiation revalidates tenant, owner, amount, currency, intent expiry and merchant configuration. The external provider call occurs after the database transaction commits. A 202 response and ambiguous timeout both remain pending and never activate access. Live/production collection remains blocked by existing readiness gates.

## Trusted reconciliation and idempotency

Reconciliation uses the stored MTN provider reference and platform credentials. The platform intent is locked with a transaction-scoped advisory lock. Expected amount, UGX currency, platform merchant configuration and billing association are verified before activation. A unique paid-period link to both billing intent and payment intent, plus a unique subscription/period-start boundary, prevents replay and duplicate periods. Payment status, order state, paid period, subscription state, lifecycle state and audit record are committed in one short transaction.

Provider amount, currency or merchant-configuration mismatches preserve the successful financial evidence but move the order and billing intent to manual review without granting access. Polling outages and unknown outcomes remain pending with a future retry time. Failed or expired intents grant nothing and a pending lifecycle request can be billed again with a new idempotency key. No transaction remains open during provider HTTP calls.

## Period boundaries, changes and cancellation

Billing uses one clamped UTC calendar month: January 31 becomes February 28, or February 29 in a leap year. An early renewal starts at the later of the current paid end or latest scheduled paid end, so remaining access is never erased and periods do not overlap. A late renewal starts at verified-success time and does not fabricate unpaid historical coverage.

A verified scheduled upgrade or downgrade creates a future paid period for the immutable target version. The current version remains authoritative until the boundary; the scheduler applies the new plan and marks the R3A lifecycle intent applied. There is no automatic charge or proration. Failed, expired or pending plan-change payments do not change capabilities.

Cancellation retains access through the current paid end and disables automatic renewal. A verified success arriving after cancellation, after local billing expiry, or for a cancelled/obsolete lifecycle request is retained as financial evidence and routed to manual review; it never silently reverses cancellation or activates an obsolete plan. R3B performs no automatic refunds.

## Security, recovery and audit

Subscription billing initiation is owner-only and membership is derived from the authenticated database session. Provider credentials never enter browser responses. Provider references are globally unique, revenue-order and intent identifiers are tenant checked, and client success flags or redirect state are ignored. Persist-before-call plus scheduled polling recovers from process crashes after provider submission without creating another charge.

Audits cover billing-intent creation, verified paid-period activation/scheduling, verification failure and late-success/manual-review outcomes. Historical trials, plan versions, prices, subscription periods and payment evidence are preserved. No advertising credits are granted.

## Build investigation and production limitations

The earlier R3A build compiled and passed TypeScript, then homepage prerender queried the configured database and timed out. The homepage intentionally reads categories, featured products, deals, arrivals, shops and promotions during static generation; the failure was unavailable database infrastructure for build-time reads, not an R3A source regression. The isolated build uses a disposable migrated PostgreSQL database instead of weakening or bypassing those reads.

Production MTN payment initiation remains disabled, and `VENDOR_QUOTA_ENFORCEMENT_ENABLED` remains false by default. No production database migration or data mutation is part of R3B. Provider merchant identity is bound to the server-side credential/destination configuration; enabling production still requires the existing live qualification and operational review.

## Verification

`npm run test:revenue-entitlement-db` replays all migrations into disposable PostgreSQL and covers entitlement, R3A lifecycle and R3B billing behavior. Focused payment and revenue suites validate provider-state handling and domain separation. `npm run build:isolated` performs the production build against disposable infrastructure.
