# Subscription advertising benefits

## Existing foundation

Promotion credits are monetary ledger entries with unique grant/release keys and expiry (`prisma/schema.prisma:1331-1347`). Campaign creation locks vendor credits and placement capacity in a serializable transaction, records redemption, and creates a separate platform revenue order (`src/services/vendor-promotions.ts:13-15`; `src/services/promotion-inventory.ts`). Homepage capacity is two product and two shop positions, but benefits cannot guarantee either slot (`prisma/migrations/20261010130000_promotion_slot_reservations/migration.sql:46-48`).

Current trial activation grants a one-time welcome credit using `WELCOME_PROMOTION_CREDIT:{vendorId}` (`src/services/vendor-entitlement.ts:20-25`). Paid subscription creation intentionally does not grant credit (`tests/vendor-subscription-phase3-contract.test.ts:9`).

## Deferred monthly grants

`MWEZORA_REVENUE_V1` grants no automatic subscription advertising credit and reserves no placement. If a future policy version introduces a credit, it must issue only when a paid subscription period becomes effective and use a unique key such as:

`SUBSCRIPTION_CREDIT:{subscriptionPeriodId}:{benefitPolicyVersion}`

Grant in the same transaction as effective-period activation or via a durable idempotent outbox whose unique key guarantees exactly once. Store vendor, period, plan/version, amount, currency, reason, grant key and expiry. The credit ledger remains the balance source of truth.

## Expiry and period rules

- Recommended expiry: end of the benefited subscription period plus a configurable short redemption window; approval required.
- Credits do not roll over unless explicitly approved.
- Expiry must create an `EXPIRY` ledger entry or use an auditable deterministic balance rule; do not mutate the original grant.
- Campaigns already paid/reserved before credit expiry remain valid.

## Upgrade, downgrade and cancellation

- Scheduled next-period plan changes receive only the new period’s plan grant.
- Immediate upgrades, if approved, should either grant a clearly defined prorated difference or wait until next period; never grant both full tiers.
- Downgrade does not claw back credit already redeemed into a confirmed campaign.
- Cancellation leaves the current paid period benefit intact until its configured expiry.
- Payment reversal moves the subscription to review. Unspent associated grant may be neutralized with an adjustment; redeemed/active campaigns require support review rather than destructive automatic cancellation.

## Refund behavior

Refund policy is unapproved. Design requirements:

- Link grant to subscription period and any redemption to campaign.
- Compute unspent balance deterministically.
- Never produce a negative spendable balance through a blind clawback.
- If benefit was consumed, calculate/refuse refund according to approved terms and record the decision.
- Use uniquely keyed adjustment/release entries for retries.

## Campaign allowances

If plans include a number of campaigns, count qualifying campaigns per subscription period only after an approved state (for example `SCHEDULED`, `ACTIVE`, `COMPLETED`). Failed/unpaid/cancelled attempts do not consume allowance. Allowance never bypasses placement availability, duplicate overlap rules, target eligibility, shop suspension rules or payment of any amount beyond credit.

## Prohibited interpretation

- No guaranteed homepage position.
- No direct vendor access to notification audiences or mass push.
- No conversion/impression promise without authoritative tracking.
- No credit issuance until amounts, expiry, accounting and refund economics are approved.
