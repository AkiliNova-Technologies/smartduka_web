# Implementation roadmap and test strategy

## Phase R2 — decisions and immutable configuration

- Approve trial/order/grace/downgrade/credit/support policies.
- Define validated capability/limit schema and plan-version model.
- Add commercial snapshots and transition/audit concepts.
- Keep all new enforcement disabled.

Acceptance: three confirmed prices represented once; no free plan; old records render unchanged; invalid plan configuration cannot publish.

## Phase R3 — centralized entitlement read model

- Refactor current service into typed effective-state/capability/limit/usage evaluation.
- Remove trial activation side effect from GET.
- Add explicit idempotent trial activation/extension policy.
- Add shadow decisions and usage reporting.

Acceptance: deterministic snapshots at boundary dates; two vendors cannot see each other; security/shop status supersedes plan; old clients tolerate DTO additions.

## Phase R4 — transactional enforcement

- Staff quota through shared transaction lock.
- Active product publication quota.
- Active branch create/reactivation quota.
- Standard/branch inventory capability gates.
- Analytics/export/campaign/support server gates.

Acceptance: concurrent attempts cannot exceed quotas; quota-reducing and existing-order operations remain available; UI-only bypass attempts fail server-side.

R2B resource-quota status: implemented behind a disabled-by-default server rollout switch with vendor-scoped transaction advisory locks. Product, branch, and staff increases use the shared guard. Capability gates for analytics, exports, inventory tiers, campaigns, and support remain later-phase work.

## Phase R5 — lifecycle and plan changes

- Pending/scheduled/grace/cancel semantics.
- Upgrade/downgrade workflows and overlap invariant.
- Admin adjustment/override audit.
- Public visibility/new-checkout policy after expiry.

Acceptance: time-bound state matrix passes; no destructive expiry behavior; duplicate schedulers/callbacks are idempotent.

## Phase R6 — analytics and advertising benefits

- Tiered metric query services and private exports.
- Transparent Premium insight formulas and tracking additions.
- Subscription-period credit grants after amounts/economics approval.
- Adjustment/expiry/refund workflows.

Acceptance: metric fixture calculations and isolation pass; one credit per effective period; capacity cannot be bypassed; no mass-push access.

## Phase R7 — isolated qualification and rollout

- Fresh isolated PostgreSQL migration and concurrency suites.
- Firebase Emulator authenticated role/account-switch tests.
- Playwright subscription/trial/quota/expiry journeys.
- Platform MTN sandbox then provider-approved live qualification, without mixing marketplace intents.
- Shadow-mode comparison, staged enforcement and monitoring.

## Test matrix

| Area | Required tests |
| --- | --- |
| Trial | first eligibility, duplicate activation, ineligible identity group, verification prerequisite, exact boundary expiry, extension audit, conversion |
| Payment activation | 202 remains pending, trusted success activates once, wrong amount/currency rejected, duplicate callback no-op, polling/callback race, reversal |
| Product quota | draft allowed, publish at limit denied, archive then publish allowed, two concurrent final slots produce one success |
| Branch quota | create/reactivate count; inactive/history retained; concurrent creation; primary invariant |
| Staff quota | owner excluded, active delegated roles counted, concurrent add, removal frees seat, cross-vendor user rejected |
| Feature gates | branch inventory, analytics levels, CSV, campaign creation denied/allowed server-side independent of UI |
| Lifecycle | trial→paid, renewal, future plan, grace, expiry, cancel-at-period-end, reversal/review, admin override expiry |
| Upgrade/downgrade | effective date, price snapshot, no overlapping period, over-limit resources retained, new growth blocked |
| Credits | one grant per period, expiry, redemption race, upgrade difference policy, reversal/refund adjustment, cancellation, capacity denial |
| Isolation/security | vendor IDs ignored from client, cached snapshot cannot cross account, role permissions, suspended/banned shop still restricted |
| Analytics | exact formulas/status/refund/timezone, branch scope, CSV escaping/PII, minimum history for forecasts |

## Infrastructure

- PostgreSQL integration tests must use disposable loopback databases and real constraints/advisory locks.
- Firebase Emulator provides real authenticated principals for vendor owner/staff/admin browser tests.
- Playwright covers Starter/Growth/Premium UI, payment-pending state, upgrade prompts, over-limit remediation and existing-order access after expiry.
- Provider adapters are faked for deterministic tests. Sandbox/live qualification is a separate controlled run and never part of ordinary CI.
- Add fault injection for scheduler retries, serializable conflicts and duplicate messages.

## Exit criteria

No enforcement launches until the repository baseline is green, migrations replay from zero, concurrency tests pass, rollback flags work, entitlement denial metrics are monitored and payment production qualification is complete for actual paid activation.
