# Subscription package specification

## Confirmed commercial catalogue

| Code | Display name | Monthly price | Currency | Commission on customer sales |
| --- | --- | ---: | --- | ---: |
| `STARTER` | Starter | 25,000 | UGX | 0% |
| `GROWTH` | Growth | 60,000 | UGX | 0% |
| `PREMIUM` | Premium | 120,000 | UGX | 0% |

There is no permanently free package. `LIMITED` is an account-operability state after trial/subscription, not a purchasable plan.

## Approved capability matrix — `MWEZORA_REVENUE_V1`

| Capability | Starter proposal | Growth proposal | Premium proposal |
| --- | --- | --- | --- |
| Active product listings | 100 | 1,000 | Fair-use unlimited (`null`), 10,000 safety ceiling |
| Active shop branches | 1 | 5 | 20 |
| Staff accounts (owner excluded) | 2 | 10 | 30 |
| Standard inventory | Yes | Yes | Yes |
| Advanced branch inventory | No | Yes | Yes |
| Basic analytics | Yes | Yes | Yes |
| Advanced analytics | No | Yes | Yes |
| Premium business insights | No | No | Yes |
| CSV exports | No | Yes | Yes |
| Advertising access | Yes; no included inventory | Yes; no included inventory | Yes; no included inventory |
| Monthly advertising credit | None | None | None |
| Promotional campaign allowance | None | None | None |

“Unlimited” is represented as `null`, with the separate configurable/documented fair-use safety ceiling. Advertising access permits the normal paid campaign workflow only; it never reserves or guarantees homepage inventory.

## Canonical capability keys

Proposed typed keys:

- `catalog.products.publish`
- `locations.branches.manage`
- `team.members.manage`
- `inventory.standard`
- `inventory.branch`
- `analytics.basic`
- `analytics.advanced`
- `analytics.premium_insights`
- `exports.csv`
- `advertising.campaigns.create`

Proposed numeric limits:

- `products.active.max`
- `branches.active.max`
- `staff.active.max`
- `products.active.safety_ceiling` for Premium fair-use protection

Existing `maxProducts`, `staffSeats`, `hasAdvancedCharts` and `features` can be read during migration, but new enforcement should consume one validated plan-capability object. Do not read `maxProducts` in product service, `staffSeats` in team service and JSON strings elsewhere indefinitely; normalize inside `VendorEntitlementService`.

## Counting rules

- Products: count non-deleted `ACTIVE`/`PUBLISHED` products. Draft and archived products are retained and do not consume active-listing quota.
- Branches: count active branches. Inactive historical branches remain stored.
- Staff: count active delegated vendor users; owner excluded. Suspended/removed membership does not consume a seat after its effective removal.
- Campaign allowance: count campaigns whose billing period attribution and qualifying status match an approved policy; failed/cancelled unpaid attempts must not consume it.
- Credits: monetary ledger balance, never a boolean capability.

## Over-limit behavior

An upgrade/downgrade must never auto-delete or silently deactivate resources. When existing usage exceeds the effective limit:

- Block new quota-increasing operations.
- Permit reads, order management and quota-reducing actions.
- Permit edits that do not increase count; product edits must not republish an additional listing.
- Display usage, limit and required plan.
- Apply downgrade only at next period unless an administrator explicitly schedules a remediation window.

## Existing implementation gap

Current seed/service define Starter and legacy Business only, at 25,000/60,000 (`scripts/seed-subscription-plans.mjs:6-10`; `src/services/vendor-subscriptions.ts:6-13`). `SubscriptionPlan` already has `maxProducts`, `staffSeats`, charts and feature JSON (`prisma/schema.prisma:2199-2221`), but only staff and product-publishing capability are enforced today.
