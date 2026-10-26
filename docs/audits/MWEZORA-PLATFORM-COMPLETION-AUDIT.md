# Mwezora platform completion audit

Audit date: 2026-10-18  
Scope: repository at commit `9f1840e`; source-only/read-only audit, with verification commands that do not contact production or payment providers.

## Executive summary

Mwezora is a broad, late-stage marketplace implementation, but it is **not production ready**. The catalogue, multi-vendor checkout calculation, authoritative vendor membership, order/inventory transactions, shop verification, subscriptions, advertising reservations, in-app notifications, browser-push outbox, admin workspaces, PWA shell, and Mobile API V1 all have meaningful implementations. The repository is materially beyond a prototype.

Launch is nevertheless blocked by payment-provider qualification and several operational gaps. Customer MTN payment initiation is deliberately sandbox-only and throws outside sandbox; Airtel is an unavailable adapter. Consequently, direct customer-to-vendor settlement is architecturally preserved but not production verified. Platform MTN charging for subscriptions/advertising is separately gated and disabled by default. No deployment scheduler, production health endpoint, external error monitoring, or structured logging integration is present. Backup guidance exists, but no successful restore evidence is in the repository.

There are confirmed product gaps: branch-to-branch inventory transfer and branch deletion workflows are absent; coupons use a mock database; tax and discount engines are explicitly zero; the mobile cart remains device-local; vendor-team mobile mutations are absent. Push delivery code is extensive, but real OS-level delivery is not evidenced. The standard test run currently fails 3 of 961 tests (929 pass, 29 skip), so the baseline is red.

No critical source vulnerability was confirmed. High-risk findings are production payment unavailability and insufficient production operational evidence. Medium findings include process-local rate limiting, incomplete application-wide CSP/clickjacking headers, magic-email cron authorization, and incomplete CSRF coverage on cookie-authenticated mutations.

## Method and evidence limits

- Inspected application routes, services, hooks/clients, Prisma schema and all migration names, configuration, scripts, tests, PWA assets, and existing documentation.
- Read the bundled Next.js 16 production and CSP guidance before evaluating the Next-specific implementation.
- Ran `npx prisma validate`: passed.
- Ran `npx vitest run --reporter=dot`: 198 test files passed, 3 failed, 5 skipped; 929 tests passed, 3 failed, 29 skipped.
- A direct `npx tsc --noEmit` was inconclusive because stale `.next/types` entries referenced missing generated files. A canonical build could not be cleanly repeated because `.next/lock` reported another build while no process was visible. This audit does not claim a passing build.
- No database integration suite, Playwright suite, network/provider call, production environment, production data, or destructive operation was used.

## Architecture overview

| Area | Observed architecture | Evidence |
| --- | --- | --- |
| Runtime | Installed Next.js 16.4.0 (package range `^16.3.6`), React 19.2.4, TypeScript 5.9.3, App Router, Cache Components | `package.json:38-91`, `next.config.ts:27-50` |
| Persistence | Prisma 7.10/PostgreSQL through `@prisma/adapter-pg`; 54 timestamped migrations; large relational schema | `package.json:44-46,62,88`, `prisma/schema.prisma:688-2690`, `prisma.config.ts` |
| Authentication | Firebase token verification/sync plus signed HTTP-only application session; DB state is authoritative | `src/lib/auth/session.ts:24-117`, `src/services/auth-sync.ts`, `src/lib/firebase/admin.ts` |
| Authorization | DB-derived platform roles and vendor membership/roles; service-level guards | `src/lib/auth/admin-context.ts:13-31`, `src/lib/auth/vendor-context.ts:24-77`, `src/lib/auth/permissions.ts:23-73` |
| API | Next route handlers under `/api`, versioned mobile `/api/v1`, thin handlers backed mainly by services | `src/app/api/**/route.ts`, `src/lib/api/v1/contracts.ts`, `src/services/*` |
| UI/data | Customer, vendor and admin route groups; providers/hooks/typed clients coexist with some direct page fetches | `src/app/(customer)`, `src/app/(vendor)`, `src/app/(admin)`, `src/hooks`, `src/lib/*-client.ts` |
| Storage | Supabase Storage; public marketplace media and private KYC references | `src/lib/supabase/storage-contract.ts`, `src/app/api/storage/upload/route.ts:9-29`, `src/lib/private-document-storage.ts:3-12` |
| Payments | Marketplace `PaymentIntent` targets vendor payment accounts; separate platform-revenue order/intent ledger | `prisma/schema.prisma:1791-1905,1428-1477`, `src/services/payment-eligibility.ts:17-82` |
| Workers | Cron-invoked reconciliation/schedulers and durable push outbox; local push runner script | `src/app/api/cron/platform-revenue/route.ts:1-10`, `src/services/push-delivery-outbox.ts`, `package.json:8` |
| UI system | Tailwind 4, shadcn/Radix primitives, Ark UI, shared dashboard/table/status components | `package.json:39-74`, `src/components/ui`, `src/components/dashboard-*` |
| Tests | Vitest unit/contract tests, opt-in PostgreSQL integration runners, two Playwright acceptance specs | `package.json:12-20`, `tests`, `tests/browser` |
| Deployment | Next build/start only; no checked-in Vercel cron, container, CI, or equivalent scheduler configuration | `package.json:7-10`; absence confirmed by repository inventory |

## Domain audit

### Customer marketplace

Homepage discovery, hero fallback, featured products/shops, sponsored rendering, catalogue/search/filter/category routes, variants, product detail/images, wishlist, recently viewed, cart, checkout, order history/detail, settings, and notifications exist. Checkout resolves current database prices and variants server-side, rejects unavailable products/options, aggregates duplicate stock requirements, locks inventory identity, atomically decrements guarded stock, and uses a customer/idempotency constraint (`src/services/order.ts:177-248,251-323,329-470`; `prisma/schema.prisma:1701-1741`). Multi-vendor totals explicitly preserve zero marketplace commission (`src/services/order.ts:170-174,278-304`).

Gaps and limits:

- Coupons are rendered from `mockDatabase`, not persisted business logic (`src/app/(customer)/coupons/page.tsx:5-11`, `src/data/mockDatabase.ts`).
- Tax and discounts are hard-coded to zero; there is no discount engine (`src/services/order.ts:290-303`).
- Cart and guest recently-viewed state use legacy `smartduka-*` browser keys; authenticated wishlist/recently-viewed merging exists, but cart is device-local and no server cart model exists (`src/providers/UserDataProvider.tsx:270-277,660-670`, `docs/mobile-api-v1-audit.md:18`). This makes cross-device persistence missing and account-switch isolation dependent on provider cleanup; browser acceptance is required.
- Payment initiation prevents a complete production purchase journey (Payments below).
- Saved profile/contact fields exist, but a first-class multi-address book was not found; checkout captures a delivery address per order.

### Vendor lifecycle and administration

Registration/application, KYC documents, shop profile, shop verification/resubmission, approval/rejection/suspension/revocation, dashboard/analytics, products/variants, orders, finance, team, subscription, ads and payment-account surfaces have meaningful code and routes. Vendor authority is derived from current session user and DB membership, not payload vendor IDs (`src/lib/auth/vendor-context.ts:24-77`). Permission mapping makes legal and payout settings owner-specialized while team/shop/product capabilities vary by role (`src/lib/auth/permissions.ts:35-52`). Private documents accept only canonical vendor-owned KYC paths (`src/lib/private-document-storage.ts:5-12`).

The model uses a single `User.vendorId/vendorRole`, so a user cannot belong to multiple vendors concurrently; this is a functional limitation rather than a cross-vendor bypass (`prisma/schema.prisma:731-803`). Mobile V1 exposes vendor-team read only, not membership mutations (`docs/mobile-api-v1-audit.md:26`). Many administrative mutations create audit logs, but logging is not enforced centrally and several admin notification/finance paths have no visible audit-log write; audit completeness is partial (`prisma/schema.prisma:2508-2529`; compare `rg auditLog.create src`).

### Multi-branch operations

`ShopBranch`, `BranchInventory`, and `InventoryMovement` exist with shop/branch/product identity indexes and idempotent movement request keys (`prisma/schema.prisma:1093-1170`). Branch create/update runs serializable transactions and DB-derived authorization; deactivation is blocked when active orders exist (`src/services/shop-branches.ts:39-72`). Location-managed inventory supports enablement, allocation, restock/adjustment, canonical stock reconciliation, row/advisory locking, non-negative checks and movement history (`src/services/branch-inventory.ts:7-76`, `src/services/inventory-integrity.ts`). Checkout snapshots branch details and atomically decrements both canonical and branch stock; cancellation restores branch stock (`src/services/order.ts:480-516`; `src/services/returns-refunds.ts:43-63`).

Confirmed missing workflows:

- No branch-to-branch transfer service/API/UI or paired transfer movement was found.
- No branch deletion operation exists. Only deactivation is implemented, which is preferable for historical integrity but leaves no explicit archival/delete policy.
- Primary uniqueness is maintained by transactional `updateMany`, but the schema has no partial unique database constraint guaranteeing one primary branch; serializable transactions reduce but do not replace the invariant (`src/services/shop-branches.ts:49-54,61-72`, `prisma/schema.prisma:1093-1126`).

### Payments

The schema separates marketplace customer-to-vendor intents from platform-revenue intents. Checkout uses verified vendor payment accounts and records zero commission, preserving the stated no-commission model (`src/services/payment-eligibility.ts:17-82`, `src/services/order.ts:170-174,520+`). Reconciliation, retry metadata, provider events, refunds, reversals, disputes, risk flags and administrative investigation services/tests exist.

Status by provider:

- **MTN marketplace: sandbox implemented, production blocked.** `initiatePayment` throws unless environment is sandbox with explicit testing enabled, stating production merchant routing is not implemented (`src/lib/payments/providers/mtn-momo-provider.ts:44-53`). Direct-vendor verification flags default false (`.env.example:44-58`).
- **Airtel marketplace: missing/blocked.** Both initiation and status polling throw `PaymentProviderUnavailableError` (`src/lib/payments/providers/airtel-money-provider.ts:1-4`).
- **Pesapal: historical path only.** Environment defaults disable new checkout and comments limit it to reconciliation (`.env.example:21-25,150-157`).
- **Platform MTN: implemented behind safety gates; production evidence absent.** It is isolated from marketplace intents, but platform production charging defaults false (`.env.example:67-109`). Existing scripts show qualification tooling, not proof it ran successfully against production.

No provider call was made. There is no evidence of certified live merchant routing, callback acceptance at a public production endpoint, settlement reconciliation to each vendor, live reversal/refund behavior, or production dispute operations.

### Subscriptions and advertising

Plans, seed script, trial/grace/expiry statuses, subscription quotes/orders, activation and scheduler logic exist (`prisma/schema.prisma:2199-2249`, `scripts/seed-subscription-plans.mjs`, `src/services/vendor-subscriptions.ts`, `src/services/subscription-scheduler.ts`). Payment uses the separate platform ledger. Contract tests exist, but this audit did not run the isolated PostgreSQL platform-payment flow; production activation therefore remains blocked by platform MTN qualification and scheduler deployment.

Advertising includes product/shop targets, quotes, credits, platform payment, reservations, capacity, campaign scheduling/cancellation/recovery, curated fallback, and admin surfaces (`prisma/schema.prisma:1331-1477`, `src/services/vendor-promotions.ts`, `src/services/promotion-inventory.ts`). PostgreSQL advisory/transactional capacity logic and unique constraints are present. Homepage placements are designed as two product and two shop paid slots with fallback, covered by contract tests, but browser evidence was not produced in this audit. Production readiness is blocked by platform payment and scheduler operations.

### Notifications and push

P0 in-app notification ownership, idempotency, read/unread and soft delete are implemented (`prisma/schema.prisma:2250-2273`, `src/services/notifications.ts`). Announcements and consent-aware marketing campaigns have lifecycle, targeting and per-user state models (`prisma/schema.prisma:2355-2490`). Browser subscriptions store encrypted endpoint/key material; the durable outbox has idempotency, locks, retries, expiry/failure state and dispatch cursors (`prisma/schema.prisma:2274-2354`, `src/services/browser-push-subscriptions.ts`, `src/services/push-delivery-outbox.ts`). Service-worker click navigation is implemented/tested (`public/sw.js`, `tests/pwa-notification-click.test.ts`).

Real OS-level delivery is **unknown** for transactional, announcement and marketing categories. DB integration/contract tests and transport acceptance are not device acceptance. VAPID and encryption keys default absent/disabled (`.env.example:11-19`). Worker execution is bundled into a cron route, but no production schedule is checked in.

### Mobile/PWA and design system

The manifest, install icons/maskable icons, theme colors, offline page, service worker registration/caching and push click handler exist (`src/app/manifest.ts`, `public/sw.js`, `public/offline.html`). Responsive customer/vendor/admin layouts and shared shadcn/Radix components are widespread. Mobile V1 covers auth/profile, home, catalogue/search, shops, wishlist, checkout/orders/payment status, notifications/push, reports, uploads, and vendor operations (`src/app/api/v1`, `src/lib/api/v1/contracts.ts`). No Flutter code exists in this repository; any Flutter client requires a separate repository audit.

Design consistency is partial: three current contract failures demonstrate drift in verification button composition, expected mobile symbol branding, and notification sheet sizing. Legacy SmartDuka text/storage/API names remain in user-visible vendor/admin copy and internals (`src/app/(vendor)/vendor/products/VendorProductsClient.tsx:209`, `src/app/(admin)/admin/revenue/page.tsx:241`, `src/app/api/v1/README.md:1`, `src/providers/UserDataProvider.tsx:270-277`). Direct `fetch` logic remains in some page components, contrary to the repository boundary rule (for example `src/app/(admin)/admin/finance/payments/page.tsx:20-24`).

## Security findings

| Severity | Finding | Evidence and consequence |
| --- | --- | --- |
| HIGH | Production customer payment providers are unavailable/unqualified | MTN initiation is sandbox-only and Airtel always throws (`mtn-momo-provider.ts:44-53`; `airtel-money-provider.ts:1-4`). Launching checkout would create an incomplete paid journey. |
| MEDIUM | Rate limiting is per-process memory only | `src/lib/rate-limit.ts:1-13`. It resets on restart and is ineffective across replicas; abuse controls are not production-grade. |
| MEDIUM | Application-wide CSP/frame protection is incomplete | Global headers omit CSP and `X-Frame-Options`/`frame-ancestors`; CSP is applied only to `/sw.js` (`next.config.ts:5-25`). XSS still benefits from React escaping, but defense in depth is incomplete. |
| MEDIUM | CSRF enforcement is inconsistent | Same-origin checks exist for cleanup and push mutations, but many cookie-authenticated POST/PATCH routes do not call them (compare `src/lib/request-origin.ts:3-18` with `src/app/api/admin/notifications/**`). SameSite cookie behavior helps, but explicit coverage is incomplete. |
| MEDIUM | Cron authorization relies on a magic authenticated email, not `CRON_SECRET` or platform role | `src/app/api/cron/payment-reconciliation/route.ts:1-3`, `src/app/api/cron/platform-revenue/route.ts:1-10`; `.env.example:6` declares an unused cron secret. Compromise/mis-provisioning of that identity permits worker execution. |
| MEDIUM | File validation trusts declared MIME/type and size | `src/app/api/storage/upload/route.ts:20-29`. There is no magic-byte scan, malware scan, or image decode/re-encode evidence, especially relevant to private PDFs. |
| LOW | Error logging is unstructured and console-based | Example `src/app/api/storage/upload/route.ts:30`; existing hardening doc also records no external sink. This impedes detection/correlation. |
| LOW | Audit logging is not centrally guaranteed | `AuditLog` exists, but only selected service operations write it (`prisma/schema.prisma:2508-2529`; scattered `auditLog.create`). Some privileged publication/finance operations lack obvious entries. |

Positive controls include DB-authoritative sessions and roles, vendor membership enforcement, private KYC references, encrypted payout/push secrets, strict Zod contracts in Mobile V1, server-side price/stock resolution, serializable inventory operations, idempotency keys, trusted provider status re-query, and safe redirect helpers.

## Database findings

- Prisma schema validation passes. The schema contains strong uniqueness for checkout idempotency, notification/outbox keys, campaign reservations, payment references, and inventory movement request IDs.
- Checkout and branch inventory use guarded updates and explicit transaction/locking helpers, materially reducing oversell races (`src/services/order.ts:429-470`, `src/services/inventory-integrity.ts`).
- Primary branch is an application invariant only; add a database-enforced strategy or invariant check (`prisma/schema.prisma:1093-1126`).
- `VendorSubscription` has an index on vendor but no schema-level rule preventing multiple overlapping active/trial subscriptions; service transactions must remain authoritative (`prisma/schema.prisma:2224-2249`).
- `PaymentGatewayWebhookLog` indexes tracking/reference but has no uniqueness constraint, so idempotency must be enforced elsewhere (`prisma/schema.prisma:2542-2557`). Marketplace provider events do have dedicated identity fields/constraints in the payment models.
- Several list/admin queries require runtime-volume review; repository inspection cannot establish query plans or production cardinality. Exact mobile filtered totals are already documented as approximate/missing (`docs/mobile-api-v1-audit.md:15`).
- Migration deployment from zero was not rerun. The earlier hardening document claims it passed, but this audit treats that as historical evidence, not current verification.

## Test coverage assessment

| Coverage | Modules |
| --- | --- |
| Strong contract/unit coverage | auth/session/RBAC, catalogue/variants, checkout/idempotency, inventory/fulfillment, refunds/returns/disputes, promotion capacity, notification contracts, PWA contracts |
| DB integration available but opt-in | branch fulfillment/inventory, promotion reservations, customer orders, announcement push, marketing push |
| Browser acceptance present but narrow | customer orders and marketing push only; current run not performed (`tests/browser/*.spec.ts`) |
| Contract-only or provider-mocked | MTN/Airtel/payment callbacks, platform subscription/ad payment, real push delivery, Supabase/Firebase operational behavior |
| No meaningful evidence | production provider settlement, real-device push categories, restore drill, multi-replica rate limits, production scheduler/alerting, branch transfer (feature absent) |

Current baseline failures are likely test/implementation expectation drift, not proven business-logic failures: `admin-verification-workspace-contract`, `mwezora-brand-contract`, and `notification-sheet-modernization`. They still make the release gate red and must be resolved deliberately.

## Confirmed vs requiring verification

Confirmed from source: sandbox-only marketplace MTN, unavailable Airtel, zero commission, mock coupons, zero tax/discount, missing branch transfer/delete, durable push outbox, DB-derived RBAC, three baseline test failures, absent checked-in scheduler/deployment config.

Requires isolated/runtime verification: clean migration replay, PostgreSQL concurrency suites, authenticated customer/vendor/admin browser journeys, guest-to-account/cart isolation, subscription/ad activation, real-device push, provider callbacks, backup restore, load/rate-limit behavior, mobile client compatibility and production environment configuration.

## Recommended next phase

Run a **Phase 4B launch-blocker closure and isolated acceptance qualification**. First close the provider/cron/security/green-baseline P0s without enabling live charging. Then deploy an isolated review environment with disposable PostgreSQL/Firebase fixtures and execute authenticated browser, DB concurrency, scheduler and real-device push acceptance. Production payment enablement must be its own provider-certified gate after direct-to-vendor settlement evidence exists.

See `MWEZORA-FEATURE-MATRIX.md`, `MWEZORA-REMAINING-WORK-BACKLOG.md`, and `MWEZORA-PRODUCTION-READINESS.md` for the full classification and acceptance backlog.
