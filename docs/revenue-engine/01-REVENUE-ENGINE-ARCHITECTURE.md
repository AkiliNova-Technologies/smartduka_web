# Revenue engine architecture

## Boundaries

The revenue engine has four distinct concerns:

1. **Catalogue configuration:** versioned paid-plan definitions and trial policy.
2. **Entitlement evaluation:** one effective vendor access snapshot derived from trial, subscription, plan version and overrides.
3. **Platform billing:** existing platform revenue order/intent and authoritative reconciliation.
4. **Feature enforcement:** domain services ask the entitlement service before committing quota-consuming or gated operations.

Marketplace order payments must never enter this boundary. `PlatformRevenueOrder`/`PlatformPaymentIntent` are the reusable vendor-to-Mwezora ledger; marketplace `PaymentIntent` remains customer-to-vendor (`prisma/schema.prisma:1428-1477,1819-1905`). Commission stays zero; existing checkout already forces zero (`src/services/order.ts:170-174,301-303`).

## Proposed component flow

```text
Vendor request
  -> authoritative vendor context
  -> domain service
  -> VendorEntitlementService.evaluate(vendorId, transaction?)
       -> trial policy/state
       -> effective subscription period
       -> immutable plan-version capability snapshot
       -> administrative override(s)
       -> authoritative usage counters/queries
  -> capability/quota decision
  -> same DB transaction locks quota scope and performs mutation

Subscription purchase
  -> canonical plan/version and server price
  -> PlatformRevenueOrder (SUBSCRIPTION)
  -> PlatformPaymentIntent
  -> provider status re-query
  -> trusted reconciliation + advisory lock
  -> paid period becomes effective
  -> period benefit grants/outbox events
```

## Reuse versus new implementation

| Concern | Reuse | New work |
| --- | --- | --- |
| Plan storage | `SubscriptionPlan` price/currency/billing/features | Plan version/snapshot and structured capability schema |
| Subscription periods | `VendorSubscription` dates/status | Effective-state rules, upgrade/downgrade/cancel/grace semantics, overlap invariant |
| Billing | Platform order/intent/reconciliation | Commercial snapshot, adjustment/refund policy, admin controls |
| Trial | `VendorProfile.trialStartedAt/trialEndsAt` | Explicit eligibility, activation reason, extensions and abuse controls |
| Entitlements | Existing `VendorEntitlementService` | Typed decisions, quotas/usage, explanations, transaction-aware enforcement |
| Credits | `PromotionCreditLedger` | Subscription-period grant keys, policy version and expiry/refund rules |
| Scheduling | Existing subscription/platform cron | Durable event/outbox or idempotent period jobs, stronger scheduler authentication |

## Proposed persisted concepts

Names are architectural, not approved schema:

- `SubscriptionPlanVersion`: immutable version containing confirmed price, currency, billing interval and structured capability/limit values. Published versions cannot be edited; a new version supersedes them.
- `SubscriptionCommercialSnapshot`: attached to each purchased subscription/revenue order so history survives plan edits.
- `VendorTrial`: one explicit trial record with status, eligibility evidence, start/end, policy version and extension audit. Alternatively, add equivalent fields to `VendorProfile`, but a separate record is preferred for auditability.
- `VendorEntitlementOverride`: scoped allow/deny/limit override with reason, actor, start/end and immutable audit entry.
- `SubscriptionChange`: scheduled upgrade/downgrade/cancellation instruction, preserving who requested it and when it becomes effective.
- `SubscriptionPeriodBenefitGrant`: optional idempotency record; ledger `grantKey` remains the monetary source of truth.

Do not use mutable JSON alone for financial history. It is appropriate for configurable capabilities when validated, versioned and snapshotted. Confirmed price must also be snapshotted on the platform revenue order (already stored as subtotal/amount due).

## Effective-state precedence

1. Security/shop-status restrictions always win; subscriptions never reactivate suspended/banned shops.
2. Explicit time-bounded administrative denial can remove a capability.
3. Effective paid subscription period supplies its snapshotted plan.
4. Active eligible trial supplies trial capabilities.
5. Otherwise the vendor is `LIMITED`—not a free plan.
6. Explicit administrative grants may add narrowly scoped capability/limit exceptions, but cannot bypass security, payment verification, advertising capacity or provider readiness.

## Invariants

- At most one effective paid entitlement period per vendor/time instant.
- A payment `202`, client response or callback body never activates access.
- Amount/currency/intent/order/vendor must match before activation.
- Idempotency keys are vendor-scoped; duplicate callbacks and schedulers are no-ops.
- Resource counts and creation/publishing happen under the same transaction and quota lock.
- Expiry never deletes products, branches, users, orders, ledger entries or history.
- Existing orders, returns, disputes, withdrawals and legal/account access remain manageable in limited state.
- Credits do not guarantee placement; reservation capacity remains authoritative.

## Operational dependencies

Production needs a securely authenticated scheduler, distributed rate limiting, structured monitoring and platform MTN qualification, all identified as launch blockers in `docs/audits/MWEZORA-PRODUCTION-READINESS.md`.
