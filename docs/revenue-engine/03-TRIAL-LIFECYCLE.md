# Introductory trial lifecycle

## Product position

The trial is onboarding/testing access, not a free subscription plan. `MWEZORA_REVENUE_V1` confirms 14 days for newly activated trials. Existing stored trial expiry dates remain authoritative and are not shortened.

## Eligibility proposal

A vendor may receive one trial only when all are true:

- Vendor application is approved and shop status is active.
- Required identity/business verification threshold is satisfied (exact threshold is an open decision).
- The vendor legal entity, owner identity, verified phone and payment-account identifiers have not consumed a trial under another shop.
- No prior paid subscription, prior completed trial or fraud/risk denial exists for the vendor identity group.
- Trial policy version is recorded.

Email alone is not an abuse-resistant identity. Eligibility should use stable server-held identity links and privacy-minimized hashes where appropriate. Administrative override requires reason, actor and expiry.

## Activation

Recommended activation event: explicit “Start trial” after approval/verification and first entry to the vendor setup checklist, not account creation and not a passive GET. It should be an idempotent server mutation that records `eligibleAt`, `startedAt`, `endsAt`, policy version and actor/source. This avoids losing days during verification.

The current `GET /api/v1/vendor/entitlements` calls `ensureEligibleVendor` and can start a trial as a read side effect (`src/app/api/v1/vendor/entitlements/route.ts:5`). R1 implementation should remove this coupling.

## Trial entitlements

The approved trial metadata is 25 active products, one active branch, owner-only staff access, basic analytics, a limited advanced-analytics preview, and standard inventory. It grants no advertising credit or reserved inventory.

Trial capability evaluation returns the same typed structure as paid plans and does not treat a trial as access to every capability.

## Real orders versus test-only setup

Implementation boundary for R2A:

- Before shop verification and a verified direct vendor payment destination: setup/test mode only; products remain non-public and no real checkout.
- After verification and payment readiness: allow real listings and real orders during the trial, subject to trial quotas and all normal marketplace eligibility rules.

R2A represents and resolves trials only. It does not change catalogue visibility, checkout eligibility or order behavior.

## Expiry and conversion

- Notify at configurable milestones (current 7/3/1-day pattern is reusable).
- A paid purchase may be started during trial; access changes only after authoritative reconciliation.
- Successful payment creates a paid period beginning immediately or at trial end according to an approved conversion rule. Recommendation: begin immediately only if trial benefits are materially below paid benefits; otherwise schedule at trial end to avoid taking paid time away.
- At expiry without paid access, state becomes `LIMITED`; preserve all data and existing-order operations.

## Extensions

Only authorized billing/support roles may extend a trial. Store prior end, new end, reason, ticket/reference, actor and timestamp. Limit cumulative extension through policy; never mutate silently. Extension must not produce duplicate onboarding credits.

## Abuse and concurrency controls

- Unique one-trial constraint per vendor; broader identity-group abuse controls remain follow-up work.
- Serializable transaction/advisory lock on activation.
- Stable activation idempotency key.
- Separate, uniquely keyed onboarding credit grant.
- Audit log for activation, denial and extension.
- Risk flags can deny or pause activation; subscription does not override banned/suspended status.
