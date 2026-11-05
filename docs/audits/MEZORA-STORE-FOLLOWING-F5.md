# Mezora Store Following F5 Release Validation

Date: 2026-11-05  
Backend branch/reference: `release/store-insights` / `1a3df4344a48ef16e3ac9805b5e05470b44e6f73`  
Flutter branch/reference: `dev` / `3cad9263338e2d1af08c6156a76c6cf702aec359`

## Decision

**BLOCKED for production notification rollout.** The database, backend fan-out, web contracts, and Flutter automated coverage pass after one confirmed worker-timing correction. Production rollout remains blocked on real Firebase/browser delivery qualification, authenticated device journeys, production-like load testing, and operational alerting. Both follower rollout flags must remain disabled.

## Test environment

- Backend/web: local checkout, Node dependencies already installed, Next.js 16.4.1.
- Database: isolated PostgreSQL 17.10 cluster under `/tmp/mezora-f5-postgres`, database `mezora_f5`, localhost port 55435. The repository's configured database URLs were not used.
- Supabase compatibility: disposable no-login `anon` and `authenticated` roles plus a minimal disposable `storage.buckets` table were required by older migrations. No existing PostgreSQL role, database, or authentication setting was changed.
- Flutter: local `dev` checkout with pre-existing unrelated modifications preserved. Flutter analysis and focused tests ran outside the restricted sandbox.
- Android: physical TECNO PR651E, Android 11/API 30, was detected. No production push was sent.

## Migration validation

| Item | Result | Evidence |
|---|---|---|
| Complete migration order (71 migrations) | PASS | Clean `prisma migrate deploy` completed through `20261105090000_follower_notifications`. |
| Store Following migrations | PASS | `20261104150000`, `20261104190000`, and `20261105090000` applied in order. |
| StoreFollow uniqueness and foreign keys | PASS | Unique `(customerId, vendorId)` rejected a duplicate with Prisma `P2002`; customer/vendor cascade FKs present. |
| Publication/event/dispatch tables | PASS | Tables, enums, event/dispatch FKs, status scheduling index, and publication/event uniqueness verified from PostgreSQL catalogs. |
| Notification idempotency | PASS | Unique notification idempotency key, unique event/user outbox key, unique event/publication, and unique dispatch/event keys present and exercised. |
| Recovery behavior | PASS | Initial clean-chain attempts exposed missing Supabase roles/storage infrastructure; the disposable database was recreated and the chain reapplied successfully. Production recovery must use the normal forward-only Prisma process, not ad-hoc role/table creation. |
| Rollback documentation | BLOCKED | Feature documentation states forward-only deployment but contains no feature-specific rollback/runbook for partially enabled fan-out. |
| Configured environment schema | BLOCKED | A read-only initial build reported that its configured database did not contain `StoreFollow`. No migration was attempted there. The build passed when explicitly pointed at the migrated disposable database. |

## Backend integration and reliability

| Item | Result | Evidence |
|---|---|---|
| Follow active store / idempotent repeated follow | PASS | Real Prisma service and database; one row persisted and DB uniqueness enforced. |
| Draft, review, owner/admin publication boundary | PASS | Service/route contract tests cover lifecycle and role boundary; real migration constraints pass. Full browser-driven vendor journey was not run. |
| Publication event persistence | PASS | Real event persisted with stable event key and one dispatch. |
| Eligible follower history | PASS | Real worker created the expected account-scoped in-app notification and safe storefront destination. |
| Ineligible/suspended customer suppression | PASS | Consent-disabled and suspended followers received no history record. |
| Unfollow suppression | PASS | A subsequent publication produced no notification after real-service unfollow. |
| Duplicate events and concurrent workers | PASS | Database uniqueness plus two concurrent real workers produced one notification; compare-and-set unit coverage also passes. |
| Worker crash, stale lease, retry exhaustion, terminal failure | PASS | Targeted worker tests cover stale recovery, bounded retry, sanitized failure categories, and terminal `FAILED`. No process-kill chaos test was run. |
| Provider outage | PASS (simulated) | Provider failure/retry paths pass automated tests. No external provider was contacted. |
| Frequency limit | PASS | Rolling limit unit test prevents notification creation at the configured threshold. |
| Vendor suspension / publication withdrawal or expiry / campaign entitlement | PASS | Worker and outbox eligibility checks plus contract tests cover these states. |
| Consent change or unfollow during processing | PASS | Current follow/account/topic/global consent is queried during fan-out and rechecked by the shared push outbox immediately before external delivery. |
| Large follower batch | PASS at 5,000 synthetic rows | Cursor and eligibility plans were measured; production-scale throughput remains BLOCKED. |
| Immediate processing of newly scheduled dispatch | PASS after correction | Confirmed defect fixed by persisting the worker's `now` as `nextAttemptAt`, avoiding a one-cron-cycle delay caused by the database default being later than the claim timestamp. |
| Actual external push | BLOCKED | Deliberately not enabled or sent. Results above are in-app/database delivery or simulated provider behavior only. |

## Web integration and privacy

| Item | Result | Evidence |
|---|---|---|
| Storefront state, followed list, activity, history, preferences | PASS | Targeted contracts and full regression pass; private APIs return `Cache-Control: private, no-store`. |
| Vendor audience/publication UI and responsive contracts | PASS | Existing vendor audience and publication contract coverage passes. No live browser screenshot sweep was run. |
| Shared-cache isolation | PASS | Private route responses are no-store and identity is derived from the authenticated request. Current Next.js documentation confirms route handlers are uncached by default unless explicitly made static/cached. |
| Cross-customer / cross-vendor isolation | PASS | Services scope operations by authenticated customer/vendor; mutation APIs do not accept arbitrary recipient/customer IDs. |
| Role and approval enforcement | PASS | Manager drafting and owner/admin publication boundaries are enforced and covered by contracts. |
| Marketing consent and unfollow suppression | PASS | Real database fan-out test plus push-time recheck. Following itself does not mutate consent. |
| Follower identity exposure | PASS | Audience API exposes aggregates only. |
| Deep-link safety | PASS | Internal-path validation on backend and allowlisted destination parsing in Flutter tests. |
| Secret/log privacy | PASS | Fan-out failures log dispatch ID, category, and exception type only; no tokens, contacts, payload, or exception message. |
| Rate limiting | PASS | Follow/publication mutation route contracts use account/vendor rate limiting. Distributed production behavior was not load-tested. |

## Flutter validation

| Item | Result | Evidence |
|---|---|---|
| Follow/unfollow, list, activity feed | PASS | Focused following tests pass, including optimistic rollback and account-scope clearing. |
| Notification history and preferences | PASS | Repository/model/screen tests pass. |
| Account switching/logout | PASS | Prior state is cleared; registration cleanup and late-response rejection tests pass. |
| Deep links | PASS | Foreground/background tap and allowlisted order/product destinations pass tests; unsupported destinations are omitted. |
| Offline/error recovery | PASS | Retry, backend cleanup failure, Firebase token failure, and mutation failure paths pass tests. |
| Flutter static analysis | PASS | `flutter analyze`: no issues. |
| Focused Flutter regression | PASS | 43 tests passed. |
| Real isolated-backend Flutter journey | BLOCKED | No isolated authenticated API identity/configuration was available to the app during this run. Automated results are not represented as live backend results. |

## Android device qualification

| Item | Result | Evidence |
|---|---|---|
| Device availability | PASS | TECNO PR651E, Android 11/API 30 detected. |
| Permission request | BLOCKED | Requires an interactive authenticated build/device session. API 30 also uses the pre-Android-13 notification permission model. |
| Firebase token registration/refresh | BLOCKED | Automated provider tests pass, but no real FCM token was registered against an isolated backend. |
| Foreground delivery/navigation | BLOCKED | Simulated Flutter tests pass; no actual Firebase delivery sent. |
| Background delivery/navigation | BLOCKED | Simulated Flutter tests pass; no actual Firebase delivery sent. |
| Terminated-app navigation | BLOCKED | Requires actual Firebase delivery and interactive verification. |
| Logout/account switching | BLOCKED on device | Automated tests pass; no authenticated device identities were provided. |
| Disabled preferences / invalid destination | BLOCKED on device | Automated suppression/navigation tests pass; no real delivery was attempted. |

## Performance observations

Measured with 5,000 synthetic followers in the disposable database after `ANALYZE`:

- 500-row follower cursor read: **0.321 ms** execution, 9 shared-buffer hits.
- Authoritative account/settings eligibility join for 500 recipients: **2.869 ms**, 3,009 shared-buffer hits.
- Follower count for one 5,000-follower store: **1.609 ms**, 52 shared-buffer hits.
- Migration and constraint inspection confirms the expected indexes.

Scaling observations:

- The fan-out cursor query orders by `StoreFollow.id`; PostgreSQL used the primary-key index and filtered by vendor, rather than a vendor-plus-ID index. This can scan unrelated follows as the global table grows.
- Fan-out performs a rolling frequency count and idempotent notification write per eligible follower, so database round trips scale linearly with recipients. Fixed batches bound each claim, but production-scale throughput was not measured.
- Follower count used a sequential scan at this small, single-vendor synthetic distribution; planner behavior should be rechecked with production-like multi-vendor cardinality.

## Confirmed defect and correction

**Fixed:** newly created dispatches were not claimable in the same `run()` call. The worker captured `now`, then PostgreSQL defaulted `nextAttemptAt` to a slightly later database timestamp. The claim predicate (`nextAttemptAt <= now`) therefore excluded the just-created row until a later cron invocation. Scheduling now writes the worker timestamp explicitly. A real PostgreSQL integration test guards the complete eligibility, concurrency, idempotency, and unfollow flow.

No Flutter changes were made because its checkout contains unrelated user-owned work and no Flutter product defect was confirmed.

## Regression results

- TypeScript: PASS — `npx tsc --noEmit`.
- ESLint: PASS — `npm run lint`.
- Prisma schema: PASS — `prisma validate`.
- Next.js production build: PASS against the migrated isolated database.
- Backend full regression: PASS — 227 files passed, 12 skipped; 1,118 tests passed, 90 skipped.
- Focused backend DB/unit/contract: PASS — 16 tests passed.
- Flutter analysis: PASS — no issues.
- Focused Flutter regression: PASS — 43 tests passed.

## Remaining release blockers

1. Perform actual FCM foreground/background/terminated delivery on Android using isolated test accounts and non-production Firebase/backend configuration.
2. Perform supported-browser VAPID/service-worker delivery and click qualification without enabling production broadcasts.
3. Run authenticated Flutter and web end-to-end journeys against an isolated backend, including offline recovery and account switching.
4. Add operational alerting for stale, retrying, and failed follower dispatches.
5. Run production-like multi-vendor load tests and decide whether to add a `(vendorId, id)` cursor index and/or batch frequency checks.
6. Document a controlled rollback/disable/recovery runbook. The independent processing and push flags provide the immediate kill switches.

## Controlled rollout checklist

- [ ] Keep `FOLLOWER_NOTIFICATIONS_ENABLED=false` and `FOLLOWER_PUSH_ENABLED=false` until all blockers close.
- [ ] Back up and apply migrations through the normal deployment pipeline; verify Supabase roles/storage infrastructure first.
- [ ] Validate migration status and feature indexes in staging.
- [ ] Complete real Android and browser provider qualification with test identities.
- [ ] Configure stale/retry/failure dashboards and alerts.
- [ ] Load-test follower batches using production-like multi-vendor distribution.
- [ ] Enable in-app processing first for a controlled cohort; monitor dispatch and history idempotency.
- [ ] Enable external push independently only after provider qualification.
- [ ] Retain immediate kill-switch and recovery procedures; do not use vendor-supplied recipient IDs.

## Local commits

Recorded after validation in the final handoff.
