# Mwezora production readiness assessment

Overall decision: **NOT READY**. Customer payment production routing is blocked, the automated baseline is red, and core operational controls lack runtime evidence.

| Requirement | State | Evidence / release condition |
| --- | --- | --- |
| Next production build | NOT READY | Repeat build blocked by stale/active `.next/lock`; direct typecheck hit stale generated types. Require clean CI build. |
| Standard unit/contract suite | NOT READY | 929 pass, 3 fail, 29 skip across 961 tests. |
| Prisma schema | READY (source) | `npx prisma validate` passed. |
| Migration deployment | UNKNOWN | 54 migrations present; historical doc claims clean replay, not rerun in this audit. |
| PostgreSQL production connectivity | UNKNOWN | Not accessed by design. |
| Firebase Auth configuration | UNKNOWN | Integration exists; production credentials/domain/runtime not inspected. |
| Supabase Storage | UNKNOWN | Code and bucket contract exist; production bucket policies, CORS and private access not verified. |
| Marketplace MTN | BLOCKED | Sandbox-only initiation; requires direct-vendor production contract/certification. |
| Marketplace Airtel | BLOCKED | Adapter is unavailable pending provider contract/implementation. |
| Platform MTN subscriptions/ads | BLOCKED | Code is gated; production disabled and no live qualification evidence accepted here. |
| Zero-commission/direct vendor model | READY (architecture), BLOCKED (operations) | Checkout rate/net are zero and vendor account is selected; live settlement not proven. |
| Payment callback/reconciliation | PARTIAL | Robust source/tests; public callback, scheduler and provider behavior not production verified. |
| Inventory/order consistency | PARTIAL | Locking/guarded updates/idempotency exist; isolated DB suites not run in this audit. |
| Branch operations | NOT READY | Transfers/delete/archive invariant workflows incomplete. |
| Subscription/advertising workflows | PARTIAL/BLOCKED | Core logic exists; payment/scheduler/E2E evidence missing. |
| In-app notifications | PARTIAL | Implemented and tested at contract level; authenticated browser/account-switch run required. |
| Browser push | BLOCKED/UNKNOWN | VAPID disabled by default; no real-device category evidence. |
| PWA install/offline | PARTIAL | Assets/manifest/SW exist; Android/iOS/Lighthouse acceptance absent. |
| Mobile API V1 | PARTIAL | Broad contracts/routes; external Flutter client not audited and cart is local by design. |
| Admin RBAC | PARTIAL | Server DB-derived RBAC exists; audit-log completeness and full role browser matrix remain. |
| CSRF/rate limiting/security headers | NOT READY | Origin checks inconsistent; limiter process-local; global CSP/frame policy missing. |
| Secret handling | PARTIAL | `.env.example` separates server/public values and encryption keys; production secret manager/rotation unknown. |
| Cron/worker execution | NOT READY | Routes exist, but no schedule config; magic-email authorization; `CRON_SECRET` unused. |
| Structured logs/error monitoring | NOT READY | Console logging; no external sink/instrumentation found. |
| Health/readiness checks | NOT READY | No dedicated endpoint/config found. |
| Backups/PITR/restore | NOT READY | Runbook exists; retention and successful restore drill not evidenced. |
| Domain/canonical origin | UNKNOWN | `NEXT_PUBLIC_APP_URL` required but blank in example; production domain not inspected. |
| SEO metadata | PARTIAL | Root metadata/manifest exist; sitemap/robots/entity social metadata not evidenced. |
| Rollback procedures | UNKNOWN | No deploy-specific rollback rehearsal evidence. |
| Test-data cleanup | PARTIAL | Strong guarded implementation/tests; production execution policy requires operational review. |
| Flutter application | OUT OF SCOPE | Not in repository; separate audit required. |

## Mandatory release gates

1. Green clean install, lint, typecheck, standard tests, isolated database tests, migrations-from-zero, and production build in CI.
2. Provider-certified direct-to-vendor settlement or checkout launch with paid methods explicitly unavailable; never silently route customer funds to the platform.
3. Platform MTN qualification for subscription/advertising separately from marketplace payments.
4. Authenticated browser matrix covering guest transition, two-account switching, customer checkout/order, vendor roles/status, and admin roles.
5. Distributed rate limits, consistent CSRF policy, production CSP/frame protection, hardened uploads, and audit-log coverage.
6. Authenticated production scheduler configuration with concurrency/idempotency controls and alerting.
7. Structured redacted logs, error monitoring, health/readiness, dashboards and incident runbooks.
8. Backup retention/PITR configuration and a recorded isolated restore drill.
9. Real-device push acceptance per transactional, announcement and marketing category, including consent and revocation.
10. Canonical domain, Firebase/Supabase policies, VAPID/encryption keys, storage access, SEO/PWA metadata and rollback plan verified in a review environment.

## Safe rollout sequence

- Deploy an isolated review environment with disposable PostgreSQL and Firebase identities; keep every payment production flag false.
- Run clean migration/build/test and authenticated browser suites, including concurrency and account-switch cases.
- Exercise schedulers and push on test recipients, then complete operations/restore drills.
- Conduct provider-approved, bounded qualification for platform revenue and marketplace routing as separate exercises.
- Enable only a provider/method whose destination, reconciliation, failure, duplicate and reversal evidence is complete. Use gradual rollout with alerts and a documented kill switch.

## Evidence that must not be over-interpreted

- Passing Prisma validation does not prove migrations or production data compatibility.
- Contract/mocked payment tests do not prove merchant settlement.
- Web-push transport acceptance does not prove OS delivery.
- A successful build would not prove security or operations.
- Historical audit claims are useful context but are not current execution evidence unless repeated and recorded.
