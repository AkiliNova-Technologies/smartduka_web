# Subscription lifecycle design

## States

Retain historical `VendorSubscription` rows. Recommended semantic states:

- `PENDING_PAYMENT`: represented today as `PAST_DUE` before first payment; introduce/rename only through a migration because the current meaning is ambiguous.
- `SCHEDULED`: paid future period, such as renewal or downgrade effective next cycle.
- `ACTIVE`: authoritative successful payment and current effective window.
- `GRACE`: period ended or renewal failed, within approved grace window.
- `PAST_DUE`: payment expected/failed after an active period, where applicable.
- `CANCELLED`: no future renewal; current paid period may remain effective until its end.
- `EXPIRED`: access period ended.
- `REVERSED`/`REVIEW_REQUIRED`: payment was reversed or inconsistent; restrict growth actions pending review.

Existing enum values are `TRIAL`, `ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED` (`prisma/schema.prisma:374-387`). Trial should cease using subscription rows; additional states can be modeled explicitly later.

## Transition rules

| Event | From | To / effect |
| --- | --- | --- |
| Trial activation | eligible/no trial | trial active, no subscription row |
| Purchase created | any non-conflicting state | pending subscription + awaiting platform order; no entitlement |
| Provider HTTP 202 | pending | remain pending |
| Client/callback claim | pending | no activation; queue authoritative status check |
| Trusted payment success | pending | active now or scheduled at current period end |
| Trusted failure/expiry | pending | failed/expired order; no entitlement; retry creates controlled new intent/order policy |
| Renewal success | active | future paid period; no overlap/double grant |
| Natural period end | active | next scheduled period activates, otherwise grace/expired |
| Upgrade | active | proposed immediate prorated change or next-cycle change—approval required |
| Downgrade | active | recommended next-period only; over-limit resources retained |
| Cancel | active | stop future renewal; retain access through paid end unless refund policy says otherwise |
| Reversal | active/scheduled | review-required/past-due; do not erase history or blindly remove order access |
| Admin adjustment | any | explicit dated override/change with reason and audit |

## Payment authority and idempotency

Reuse platform reconciliation. It locks by intent, validates permitted transition and amount/currency, then marks the revenue order paid and subscription effective (`src/services/platform-payment-reconciliation.ts:22-43`). Preserve the vendor/order/intent idempotency constraints (`prisma/schema.prisma:1428-1477`). Add one effective-period overlap invariant and one benefit-grant key per subscription period.

## Upgrade/downgrade recommendation

- Downgrade: schedule for current period end; show projected over-limit resources early.
- Upgrade: initially schedule for period end to avoid proration complexity. If immediate upgrade is commercially required, create a separate adjustment order with a server-calculated prorated amount and start only after trusted success.
- Never mutate the plan on an already-paid historical subscription row. Create a new period/change record with a commercial snapshot.

## Approved R2A expiry metadata

- Never delete/unpublish products, remove staff, delete branches, or alter orders.
- Always allow fulfillment and management of pre-existing orders, returns, refunds, disputes, payouts, verification, legal and subscription settings.
- Block new resource creation/publication and new paid promotions in `LIMITED`.
- Resolve a seven-day `SUBSCRIPTION_GRACE` window after the paid period unless an explicit stored grace end applies.
- After grace, resolve `SUBSCRIPTION_EXPIRED` with no destructive mutation.

R2A does not change public visibility or checkout eligibility. Those enforcement decisions remain coordinated follow-up work because subscription expiry is not shop suspension.

## Grace and renewal

Grace duration is seven days. The existing schema has `gracePeriodEndsAt` and `cancelledAt`, while the resolver also calculates the approved default where legacy rows have no explicit grace end. Automatic renewal is not implemented; do not store reusable payer authorization or auto-charge without provider/legal approval.

## Administrative controls

Authorized billing administrators may schedule a plan/period correction, extend grace, mark a manually verified exception, or add a scoped entitlement override. They must not manually mark a provider payment successful. Each action records actor, reason, old/new value, ticket/reference and effective window.
