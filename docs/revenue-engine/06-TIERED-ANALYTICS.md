# Tiered analytics specification

## Authoritative data available now

The repository can derive metrics from `Order`, `SubOrder`, `OrderItem`, product/variant inventory, branch inventory/movements, refunds/returns, campaigns and reviews. `VendorMobileInsightsService` already calculates vendor-isolated completed/delivered revenue, order counts, status breakdown, top products, low stock and period trends. Queries must always scope by authoritative vendor ID.

## Proposed levels

### Starter — basic analytics

Supported now:

- Gross vendor sales over selected fixed periods, based on completed/delivered suborders.
- Order count and order-status distribution.
- Average order value derived from authoritative totals.
- Current product count and low-stock count/list.
- Simple recent sales trend.

Do not label marketplace totals as cash received unless payout/settlement state is included.

### Growth — advanced analytics

Mostly supported by existing records, with new queries/UI:

- Product-level units and sales ranking.
- Inventory movement/stockout views.
- Fulfillment method/status and operational turnaround where timestamps support it.
- Returns/refunds by product/reason/status.
- Campaign spend/credit/use and delivery status.
- Branch sales/order/inventory comparisons using `SubOrder.branchId` and branch snapshots.
- CSV exports of the vendor’s scoped orders, products, inventory and finance summaries.

Every metric needs a documented formula, included statuses, timezone, refund treatment and currency assumptions.

### Premium — business insights

Supported as deterministic derived insights after query work:

- Branch comparison and anomaly flags.
- Slow-moving inventory based on stock and historical order-item velocity.
- Reorder-point recommendations based on observed sales velocity and configurable lead time.
- Product contribution/trend comparisons.

Forecasting is **not currently implemented** and should not be promised as predictive accuracy. A first version may be a transparent moving-average projection with minimum-history thresholds, confidence/coverage labels and no automated purchasing. “Profit” and margin cannot be computed until vendor cost-of-goods data exists.

## New tracking requirements

- Reliable fulfillment transition timestamps if cycle-time metrics are required; current status/current timestamps may be insufficient for every stage.
- Vendor-supplied lead time, reorder buffer and optionally cost data for meaningful inventory/profit recommendations.
- Stable attribution definitions for ad impressions/clicks/conversions; current campaign/reservation data proves delivery window, not full attribution.
- Analytics query/audit metadata for exports and privacy monitoring.

## Enforcement and privacy

- Routes/services select allowed metric sets using `VendorEntitlementService`; hiding UI panels is insufficient.
- Export generation re-checks entitlement and vendor membership at execution/download time, uses private storage/short-lived URLs, records an audit event and bounds row counts.
- Never expose customer PII in aggregate analytics or exports unless operationally required and access-controlled.
- Branch and staff filters cannot accept an unverified vendor ID.
- Cache keys include vendor, capability level, period and filters; invalidate or bound staleness.

## Acceptance

Use fixture calculations with known refunds/statuses/timezones, isolation tests with two vendors, entitlement denial tests for every tier, CSV formula/escaping tests, and query-plan/load tests on representative data.
