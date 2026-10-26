# VendorEntitlementService design

## Responsibility

`VendorEntitlementService` becomes the only supported server-side interpreter of plan/trial/override configuration. UI may display its result but must never authorize itself.

Proposed response:

```ts
type VendorEntitlementSnapshot = {
  vendorId: string;
  state: "TRIAL" | "ACTIVE" | "GRACE" | "LIMITED";
  source: "TRIAL" | "SUBSCRIPTION" | "ADMIN_OVERRIDE" | "NONE";
  plan?: { code: "STARTER" | "GROWTH" | "PREMIUM"; version: number };
  effectiveFrom: Date;
  effectiveUntil?: Date;
  capabilities: Record<CapabilityKey, boolean>;
  limits: Record<LimitKey, number | null>;
  usage: Record<LimitKey, number>;
  overLimit: LimitKey[];
  pendingChange?: { kind: "UPGRADE" | "DOWNGRADE" | "CANCEL"; effectiveAt: Date };
  reasons: string[];
};
```

Public methods should include `summary`, `decision(capability)`, `requireCapability`, `usage`, and transaction-aware `assertAndReserveQuota`. Errors use stable codes such as `SUBSCRIPTION_REQUIRED`, `PLAN_UPGRADE_REQUIRED`, `QUOTA_EXCEEDED`, and include limit/usage without leaking another vendor’s data.

## Server enforcement points

| Domain | Enforce before | Quota/capability |
| --- | --- | --- |
| Product service | draft→published/active transition; create-as-published | `catalog.products.publish`, active count |
| Shop branch service | create/reactivate branch | `locations.branches.manage`, active count |
| Vendor team service | add/reactivate member | `team.members.manage`, active staff count |
| Branch inventory service | enable/use branch inventory | `inventory.branch` |
| Standard inventory | adjust simple/variant inventory | `inventory.standard` |
| Promotion service | quote/create campaign | `advertising.campaigns.create`, optional allowance; capacity remains separate |
| Analytics services/routes | select metric/query/export | analytics level and `exports.csv` |
| UI/routes | display only | consume server snapshot; never duplicate policy |

Current relevant points are `ProductService.createProduct/updateProduct` (`src/services/product.ts:759-760,882`), `ShopBranchService.create/update` (`src/services/shop-branches.ts:39-72`), `VendorTeamService.add` (`src/services/vendor-team.ts:28-45`), `BranchInventoryService.enable/mutate` (`src/services/branch-inventory.ts:18-76`) and `VendorPromotionsService.quote/create` (`src/services/vendor-promotions.ts:13-15`).

## Concurrent quota enforcement

A preflight count followed by a separate insert is unsafe. Quota-increasing mutations must:

1. Enter a serializable transaction.
2. Acquire a vendor+quota advisory lock, e.g. logical scope `entitlement:{vendorId}:{limitKey}`.
3. Re-evaluate effective entitlement inside the transaction at one database timestamp.
4. Count authoritative current usage inside the transaction.
5. Reject if `usage + delta > limit`.
6. Perform the domain mutation in the same transaction.
7. Retry serialization conflicts a bounded number of times.

The staff service already uses a serializable count/update, but should adopt the shared lock/evaluator. Product and branch limits need this pattern. An optional usage-counter table may improve scale later, but counters must be transactionally updated and reconcilable; initial authoritative counts are safer.

## R2B implementation

`VendorQuotaService.assertCanConsumeResource` is the shared mutation guard for `ACTIVE_PRODUCTS`, `SHOP_BRANCHES`, and `STAFF_ACCOUNTS`. Callers supply their existing Prisma transaction. The guard acquires `pg_advisory_xact_lock(hashtext('vendor-quota:' || shopId))`, resolves entitlement and authoritative usage through that same transaction, and throws `VendorPlanLimitError` before the write when `usage + additionalUnits` exceeds the effective limit.

The server-only rollout switch is `VENDOR_QUOTA_ENFORCEMENT_ENABLED=true`. Missing, malformed, or false configuration disables enforcement. `LEGACY_TRANSITION` is also bypassed because R2B does not record or infer the required notification timestamp.

Quota violations use HTTP 409 and code `VENDOR_PLAN_LIMIT_REACHED`, with safe details: `resource`, `currentUsage`, `limit`, `requestedUnits`, and `upgradeRequired`. Billing and payment details are excluded.

Active non-deleted `ACTIVE` or `PUBLISHED` products consume listing capacity; variants do not. Active branches consume branch capacity. Active delegated non-owner users consume staff capacity. The repository has no pending-invitation entity, so capacity is checked when an existing active user is attached to the shop.

Enforcement occurs for product creation-as-published and inactive-to-active publication in both product write stacks, active branch creation/reactivation, and attachment of a new non-owner member. Edits, drafts, archival/deactivation, member removal, and existing-member role changes remain available.

## Effective state

- `ACTIVE`: paid period is effective and unexpired.
- `TRIAL`: explicit eligible trial window is active and no paid state supersedes it.
- `GRACE`: approved grace policy applies; capabilities must be explicit, not assumed equal to active.
- `LIMITED`: no free plan. Safe capabilities remain: subscription management, settings/legal access, team read/removal, product maintenance/unpublish, existing-order fulfillment, transactions/payout/dispute/return handling.

Current `safe` capability set is reusable in spirit (`src/services/vendor-entitlement.ts:9-12`), but must be split into explicit policy and not grant `BASIC_ANALYTICS` accidentally without product approval.

## Cache rules

Do not cache entitlement snapshots across accounts or for long TTLs. Mutations must never rely on a client/cache snapshot. Server reads may use vendor-scoped short caching only with invalidation on reconciliation, period transition, trial change, plan publication and override change. Transactional assertions always query the database.

## Auditability

Every denial should be observable with vendor ID, capability, state, plan version and limit/usage (no sensitive payload). Every admin override and effective-state transition requires an immutable audit entry.
