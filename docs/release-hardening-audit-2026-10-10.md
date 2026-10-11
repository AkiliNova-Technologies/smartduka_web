# Mwezora release-hardening audit — 2026-10-10

## Completed engineering gates

- ESLint completes with zero errors and zero warnings without disabling rules.
- TypeScript completes with no errors.
- Prisma schema validation passes.
- All 48 migrations apply from zero to an isolated PostgreSQL 17 database.
- The standard suite passes. The six destructive advertising database tests are excluded from the standard run by design and pass through `npm run test:promotion-db`.
- The production build completes with webpack and constrained static-generation workers.
- Cookie consent passes a real Google Chrome first-visit, preference-save, reload-persistence, and settings-reopen flow.
- Shop moderation contracts cover catalogue visibility, checkout rejection, mobile catalogue/shop APIs, cache invalidation, and paid-ad reservation preservation/recovery. A live read-only browser/API check also confirmed an active shop returns 200 while a suspended shop and its product return 404.
- Mobile V1 contracts remain compatible; authenticated resources remain private/no-store and checkout/payment idempotency is retained.
- Marketplace payments remain direct-to-vendor. Advertising payments remain isolated in the platform-revenue ledger.

## Configuration and operational findings

- `metadataBase` is derived from `NEXT_PUBLIC_APP_URL`, with Vercel's production URL as the deployment-provided fallback. No domain is embedded in source. The current local environment does not supply either value, so deployment must provide the canonical production origin before release.
- Payment configuration is internally consistent and safe: marketplace direct-vendor routing is unverified, controlled live testing is disabled, and general platform production charging is disabled.
- Provider-facing payment logs mask references and redact contact/token-shaped values. General server errors still use the platform console rather than an external structured log/alert sink; production log retention, access controls, request correlation, alert routing, and redaction policy require operational confirmation.
- The migration chain is reproducible from an empty database. Backup retention and a successful isolated restore drill are not represented in this repository and remain a production gate; see `docs/database-recovery-runbook.md`.

## Browser scope

Cookie consent was exercised end to end in Chrome. Public moderation enforcement was checked in Chrome against read-only active and suspended fixtures; the suspended shop and product rendered the 404 page. Guest mobile V1 shop detail and search were also exercised, revealing and fixing an edge-proxy allowlist regression. Shop status itself was not mutated through the browser against the configured shared database because doing so would risk staging/production-like data. The suspension/restoration transitions and downstream effects are covered by service, route, and regression tests. A browser-level status mutation should be repeated in an isolated deployed review environment when one is available.

## External MTN gate

MTN Uganda has not confirmed or certified the required direct-to-vendor settlement model. Live routing and production charging remain disabled. Engineering gate completion does not constitute provider certification or production readiness.
