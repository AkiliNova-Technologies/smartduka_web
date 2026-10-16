# Multi-branch fulfilment architecture audit

## Existing architecture

- `VendorProfile` is the shop/tenant. Its `fulfillmentMethods`, delivery fee, and pickup fields are shop-wide compatibility settings.
- `Order` is the customer parent order; `SubOrder` is the existing vendor-specific commercial and payment boundary. `OrderItem.subOrderId` links each line to that boundary.
- Checkout resolves product and variant prices and stock on the server, groups lines by vendor, decrements stock transactionally, creates one sub-order per vendor, and snapshots fulfilment/refund policy data.
- Checkout retries are protected by `(customerId, checkoutRequestId)` and a canonical request hash. Direct payment intents belong to a sub-order and verified vendor payment account, so mixed vendor payment outcomes remain independently reconcilable.
- Inventory is shop-wide at product/variant level. It is not location-aware. Pickup eligibility therefore means only that the selected active branch accepts pickup; normal transactional shop-wide stock validation remains authoritative.
- The web checkout already supports vendor-specific delivery/pickup choices and charges zero shipping for pickup, but it uses shop-wide configuration. The V1 contract supports the same method selection but currently requires a delivery address for every request.
- Vendor and customer order views read the immutable `SubOrder.fulfillmentSnapshot`; historical pickup details therefore do not depend exclusively on live shop settings.

## Compatibility strategy

- Add branches without removing the legacy `VendorProfile` fulfilment fields. A shop with no configured active branches continues through the legacy delivery/pickup path.
- Do not fabricate branches from incomplete shop addresses. Vendors explicitly create their first branch; existing orders remain readable from their current snapshots.
- Add a nullable branch reference and an independent fulfilment status to `SubOrder`. Historical rows remain valid and nullable fields distinguish legacy orders.
- Preserve product/variant stock as the canonical inventory source. Branch stock allocation is a later, explicit migration.
- Make the parent shipping fields accept empty strings for pickup-only orders; delivery sub-orders snapshot their destination and contact at order creation.

## Payment and payout impact

Branch selection does not alter the payment boundary. Authoritative sub-order totals continue to fund the vendor's verified direct merchant destination. No marketplace collection or new payout flow is introduced.

## Follow-on inventory recommendation

Introduce a branch inventory ledger/allocation model keyed by branch and product variant, backfill explicit allocations, reconcile their sum against canonical stock, and only then advertise branch-level availability. Until that migration is complete, no API or UI should claim that stock exists at a particular branch.

## Branch inventory invariants

- Product or active-variant `inventoryCount` remains the shop-wide canonical total. Checkout currently decrements it immediately inside the same serializable transaction that creates the order; there is no separate reservation stage.
- A branch allocation partitions canonical stock and never creates stock. Total allocations for one stock identity may not exceed its canonical quantity.
- Shops opt in explicitly. Legacy shops continue canonical validation; enabled shops require one selected branch to satisfy every line.
- A branch sale decrements canonical and branch on-hand quantities and records one movement in the checkout transaction. Cancellation restores both exactly once. Existing received-return logic remains canonical-only until return destination selection is introduced.
- Product edits must not lower canonical stock below allocated stock. Vendor branch adjustments are tenant-authorized and auditable.
- Canonical reductions, product edits, allocations, restocks, and adjustments share a per-shop/product advisory lock and serializable retry path. The invariant is checked inside the write transaction.
- Restock and signed branch adjustments change canonical and branch quantities together; allocation only distributes existing canonical stock. Every branch mutation appends a movement and `(shopId, requestId)` makes mobile retries idempotent.
- Basket availability is coarse (`AVAILABLE`, `INSUFFICIENT_STOCK`, `UNAVAILABLE`, `INACTIVE`) and never exposes quantities. Every line must be available from one location; the final checkout transaction always rechecks stock.
- Operation effects: `INITIAL_ALLOCATION` increases branch allocation and reduces unallocated stock without changing canonical stock; `RESTOCK` increases canonical and the managed branch together; `ADJUSTMENT` applies the same signed correction to canonical and branch stock and requires a reason; `SALE` decreases canonical and branch stock atomically; `CANCELLATION_RESTORE` restores both exactly once. Movement rows are append-only.
