# R3A — Authoritative subscription lifecycle

Status: implemented and tested with disposable PostgreSQL. Production subscription enforcement and real payment initiation remain disabled.

## Authority and precedence

`VendorEntitlementService` remains the single read model for access. A reconciled, paid subscription period takes precedence over trial state. Pending orders and payment intents never grant access. A cancelled subscription remains effective only through its stored `currentPeriodEnd`; expiry and the existing seven-day grace policy are timestamp-driven.

Trial activation is explicit. Merely viewing a page or calling entitlement reads cannot start or extend a trial. Activation requires an active, approved and verified shop, an owner session, no consumed trial, and no prior paid access. The authoritative `VendorTrial` stores activation and expiry; the legacy profile timestamps are compatibility mirrors only. The fixed policy duration is 14 days. Administrative extensions require `platform:manage_billing`, a later timestamp and a recorded reason.

Merchant payout readiness is relevant to customer-to-vendor settlement, not to trial eligibility or vendor-to-platform subscription lifecycle operations.

## Paid lifecycle operations

R3A records lifecycle intent; it does not initiate money movement:

- Renewal eligibility creates one pending, idempotent intent for the current paid subscription. It preserves subscription identity and creates neither an order nor a payment intent.
- Upgrade and downgrade requests are scheduled for the current period end. Replacing a request cancels the prior intent. Current entitlements stay unchanged until a later paid transition is authoritatively reconciled.
- Cancellation changes the current paid period to `CANCELLED`, preserves its end timestamp and is idempotent. It never deletes catalog, order or account data.
- The scheduler expires trials and paid periods by authoritative timestamps and writes transition audits. It never calls a payment provider.

Every mutation derives the vendor from the authenticated database membership. Subscription management is owner-only; administrative extension uses platform billing permission. Advisory transaction locks, serializable transactions and database uniqueness constraints protect trial activation and lifecycle intent races.

## Audit and compatibility

The lifecycle records `TRIAL_ACTIVATED`, `TRIAL_EXTENDED`, `TRIAL_EXPIRED`, `SUBSCRIPTION_RENEWAL_ELIGIBLE`, `PLAN_CHANGE_REQUESTED`, `PLAN_CHANGE_CANCELLED`, `SUBSCRIPTION_CANCELLATION_REQUESTED`, and `SUBSCRIPTION_PERIOD_EXPIRED`. Retry paths do not duplicate transition audits.

Existing trials retain their stored expiry. Existing paid periods retain immutable plan-version commercial terms. Legacy BUSINESS subscriptions continue through the entitlement compatibility mapping and are not rewritten.

## Rollout boundary

`VENDOR_QUOTA_ENFORCEMENT_ENABLED` stays false by default. R3A does not enable mandatory production restrictions, call a real provider, collect money, or change production data. R3B must implement authenticated payment initiation and trusted reconciliation for renewals and scheduled changes before they can become paid access. R3C and production rollout remain out of scope.

The disposable database command is `npm run test:revenue-entitlement-db`. It replays all migrations and runs the R2 entitlement scenarios plus R3A lifecycle concurrency, authorization, idempotency, expiry, renewal, plan-change and cancellation coverage.
