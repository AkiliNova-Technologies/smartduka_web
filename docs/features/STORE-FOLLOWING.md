# Store Following

Store following is an authenticated customer feature shared by the web marketplace and Flutter application. It does not create marketing consent and does not send notifications.

## Data model

`StoreFollow` links the existing `User` customer identity to the existing `VendorProfile` shop identity. It stores only an ID, `customerId`, `vendorId`, and `createdAt`. The customer/vendor pair is unique. Customer/newest and vendor/count access paths are indexed. Both foreign keys cascade on identity deletion, avoiding orphaned relationships without retaining personal information.

Migration: `20261104150000_store_following`. It is additive and must be applied through the normal deployment process; it was not run against production.

## API

All private responses use `Cache-Control: private, no-store`. Identity always comes from the verified marketplace session or native bearer token.

- `GET /api/v1/shops/{vendorId}/follow` — current customer's state and authoritative count.
- `PUT /api/v1/shops/{vendorId}/follow` — idempotently follow an active, non-deleted shop.
- `DELETE /api/v1/shops/{vendorId}/follow` — idempotently unfollow only for the current customer.
- `GET /api/v1/following?page=&pageSize=` — active followed shops, newest follow first.
- `GET /api/v1/following/activity?page=&pageSize=` — eligible followed-store activity, newest first.

Mutation endpoints validate UUIDs, require an active customer session, and are account-rate-limited. No endpoint accepts a customer ID, and no vendor endpoint returns follower identities, email addresses, or phone numbers. Public cached storefront responses expose only aggregate follower counts.

## Following behavior

Follow creation uses the database unique key and `upsert`; duplicate requests do not create duplicate rows. Unfollow uses a customer-and-vendor-scoped `deleteMany`, so repeated requests succeed and cannot remove another customer's relationship. Suspended, deleted, or nonexistent stores cannot be newly followed and are excluded from lists and activity.

Web and Flutter storefronts perform an optimistic state/count update with rollback on failure and suppress repeated mutations while one is pending. Guests are sent to authentication with a validated internal storefront return path. Flutter private state watches `AuthenticatedAccountScope`; sign-out or account generation changes discard the prior customer's state.

## Activity feed

Phase F2 exposes published/active, non-deleted products from active followed shops. Event IDs are stable (`product:{id}`), ordered by `(createdAt, id)` newest first, and include shop attribution, one eligible image, publication timestamp, and product destination.

The current platform marketing-notification campaigns are platform-audience records and do not have a safe vendor ownership/lifecycle contract. They are therefore not presented as followed-store campaigns. Store announcements and collections require a vendor-owned publication model with moderation, explicit publish/unpublish timestamps, stable destinations, and entitlement enforcement before they can join this feed.

## Notifications and privacy

Following does not change `UserSettings` marketing, newsletter, in-app promotional, recommendation, or push preferences. No push or notification fan-out runs in this phase. A future follower dispatch service must resolve current follows at enqueue time and again before delivery, apply customer consent and vendor entitlements, use an idempotent outbox event, and exclude customers who have unfollowed.

## Remaining work

- Add a moderated vendor-owned announcement/campaign publication model or safely extend the existing campaign lifecycle.
- Define follower notification categories and customer preference controls.
- Add bounded outbox fan-out, cancellation/recheck semantics, abuse controls, and vendor broadcast entitlements.
- Qualify push delivery separately; following alone never authorizes marketing delivery.
