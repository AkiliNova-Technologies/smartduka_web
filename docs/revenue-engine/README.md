# R1 — Three-tier vendor revenue engine

Status: architecture only; no implementation, migration, seed, data or payment action is authorized by these documents.

## Executive decision

Mwezora should extend the existing `SubscriptionPlan` → `VendorSubscription` → `PlatformRevenueOrder` → `PlatformPaymentIntent` architecture. It must not create another billing system. Customer purchases remain zero-commission and direct-to-vendor; vendor subscriptions remain vendor-to-Mwezora platform revenue.

Confirmed commercial facts:

| Package | Monthly price | Status |
| --- | ---: | --- |
| Starter | UGX 25,000 | Confirmed |
| Growth | UGX 60,000 | Confirmed |
| Premium | UGX 120,000 | Confirmed |
| Permanent free plan | None | Confirmed |
| Introductory trial | 14 days | Confirmed in `MWEZORA_REVENUE_V1` |
| Subscription grace | 7 days | Confirmed in `MWEZORA_REVENUE_V1` |

Product, branch and staff quotas and feature entitlements are confirmed by `MWEZORA_REVENUE_V1` and live in the centralized versioned policy. Advertising credits and placement allowances remain deferred and are not granted.

R2A implements entitlement metadata only. New quota enforcement in product, branch and staff mutations remains deferred to R2B, and no mandatory production subscription restriction is activated.

## What exists and is reusable

- Plans and subscriptions already model price, billing cycle, product cap, staff seats, feature JSON, trial/active/past-due/expired states and period dates (`prisma/schema.prisma:2199-2244`).
- Trial timestamps live on `VendorProfile`; the current entitlement service activates a configurable trial and one-time promotional credit (`src/services/vendor-entitlement.ts:7-45`).
- Subscription quote/purchase already creates an idempotent platform revenue order and a non-active subscription pending payment (`src/services/vendor-subscriptions.ts:12-17`).
- Trusted provider reconciliation uses an advisory transaction lock, verifies amount/currency, and activates a subscription only after authoritative `SUCCESSFUL` status (`src/services/platform-payment-reconciliation.ts:22-43`).
- A scheduler activates prepaid future periods, expires periods and emits idempotent notices without initiating payment (`src/services/subscription-scheduler.ts:6-20`).
- Staff-seat enforcement is DB-authoritative and serializable (`src/services/vendor-team.ts:28-45`). Product publication has a capability check (`src/services/product.ts:759-760,882`).
- Promotion credits have an append-only-style ledger, unique grant/release keys, expiry, locked redemption, reservation capacity and recovery (`prisma/schema.prisma:1331-1451`; `src/services/vendor-promotions.ts`; `src/services/promotion-inventory.ts`).
- Existing vendor analytics use authoritative order, product and inventory records (`src/services/vendor-mobile-insights.ts`).

## What must change

1. Replace legacy two-plan configuration (`STARTER`, `BUSINESS`) with versioned `STARTER`, `GROWTH`, `PREMIUM`; map `BUSINESS` safely to Growth without rewriting history.
2. Separate trial policy/state from paid subscription records and make eligibility/extension auditable.
3. Expand `VendorEntitlementService` into the single server-side policy decision point for capabilities, limits and usage.
4. Enforce active-product, branch and staff quotas transactionally; gate branch inventory, analytics, exports, campaigns and support server-side.
5. Add lifecycle semantics for grace, cancellation, upgrades, downgrades and administrative adjustments while retaining immutable commercial snapshots.
6. Grant any monthly advertising benefit through uniquely keyed ledger entries only after a paid period becomes effective.
7. Add isolated PostgreSQL and authenticated browser acceptance before enabling enforcement.

## Payment blocker

Platform MTN code and qualification scripts exist, but production charging is disabled and unverified (`.env.example:67-109`; `docs/audits/MWEZORA-PRODUCTION-READINESS.md`). Architecture can be implemented and tested against fake/sandbox providers; paid production activation remains blocked until authoritative production reconciliation is qualified.

## Documents

1. [Architecture](01-REVENUE-ENGINE-ARCHITECTURE.md)
2. [Package specification](02-SUBSCRIPTION-PACKAGES.md)
3. [Trial lifecycle](03-TRIAL-LIFECYCLE.md)
4. [Entitlement service](04-ENTITLEMENT-SERVICE.md)
5. [Subscription lifecycle](05-SUBSCRIPTION-LIFECYCLE.md)
6. [Tiered analytics](06-TIERED-ANALYTICS.md)
7. [Advertising benefits](07-ADVERTISING-BENEFITS.md)
8. [Migration and compatibility](08-MIGRATION-COMPATIBILITY.md)
9. [Implementation roadmap](09-IMPLEMENTATION-ROADMAP.md)
10. [Open product decisions](10-OPEN-PRODUCT-DECISIONS.md)
11. [R2C vendor experience and acceptance](11-R2C-VENDOR-EXPERIENCE.md)
12. [R3A authoritative lifecycle](12-R3A-AUTHORITATIVE-LIFECYCLE.md)
13. [R3B verified subscription billing](13-R3B-VERIFIED-SUBSCRIPTION-BILLING.md)
14. [R3B Supabase migration recovery](14-R3B-SUPABASE-MIGRATION-RECOVERY.md)

Recommended sequence: configuration/versioning → entitlement read model → audit-only quota evaluation → transactional enforcement → lifecycle transitions → analytics/credits → isolated acceptance → provider qualification → staged rollout.
