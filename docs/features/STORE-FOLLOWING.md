# Store Following

Store following is an authenticated customer feature shared by the web marketplace and Flutter application. It does not create marketing consent and does not send notifications.

## Data model

`StoreFollow` links the existing `User` customer identity to the existing `VendorProfile` shop identity. It stores only an ID, `customerId`, `vendorId`, and `createdAt`. The customer/vendor pair is unique. Customer/newest and vendor/count access paths are indexed. Both foreign keys cascade on identity deletion, avoiding orphaned relationships without retaining personal information.

Migrations: `20261104150000_store_following`, `20261104190000_vendor_audience_publications`, and the additive Phase F4 migration `20261105090000_follower_notifications`. They must be applied through the normal deployment process; none is run against production by this work.

`StorePublication` is the vendor-owned aggregate for both `ANNOUNCEMENT` and `FOLLOWER_CAMPAIGN` content. Keeping the two kinds in one aggregate avoids parallel follower-campaign systems while preserving two important boundaries: paid `PromotionCampaign` records continue to represent sponsored placement purchases, and `MarketingNotificationCampaign` continues to represent platform-wide, consent-based marketing. Campaign product selections use `StorePublicationProduct` and can reference only active products owned by the publication's shop.

## API

All private responses use `Cache-Control: private, no-store`. Identity always comes from the verified marketplace session or native bearer token.

- `GET /api/v1/shops/{vendorId}/follow` — current customer's state and authoritative count.
- `PUT /api/v1/shops/{vendorId}/follow` — idempotently follow an active, non-deleted shop.
- `DELETE /api/v1/shops/{vendorId}/follow` — idempotently unfollow only for the current customer.
- `GET /api/v1/following?page=&pageSize=` — active followed shops, newest follow first.
- `GET /api/v1/following/activity?page=&pageSize=` — eligible followed-store activity, newest first.
- `GET /api/v1/vendor/audience` — aggregate follower, 7/30-day growth, and publication metrics; never follower identities.
- `GET /api/v1/vendor/publications` — vendor-scoped, filterable publication list.
- `POST /api/v1/vendor/publications` and `PATCH /api/v1/vendor/publications/{id}` — create and edit drafts.
- `POST /api/v1/vendor/publications/{id}/submit` — move a draft to review.
- `POST /api/v1/vendor/publications/{id}/publish` — owner/admin approval and immediate or scheduled publication.
- `POST /api/v1/vendor/publications/{id}/archive` — remove reviewed, scheduled, or published content from eligibility.

Mutation endpoints validate UUIDs, require an active customer session, and are account-rate-limited. No endpoint accepts a customer ID, and no vendor endpoint returns follower identities, email addresses, or phone numbers. Public cached storefront responses expose only aggregate follower counts.

## Following behavior

Follow creation uses the database unique key and `upsert`; duplicate requests do not create duplicate rows. Unfollow uses a customer-and-vendor-scoped `deleteMany`, so repeated requests succeed and cannot remove another customer's relationship. Suspended, deleted, or nonexistent stores cannot be newly followed and are excluded from lists and activity.

Web and Flutter storefronts perform an optimistic state/count update with rollback on failure and suppress repeated mutations while one is pending. Guests are sent to authentication with a validated internal storefront return path. Flutter private state watches `AuthenticatedAccountScope`; sign-out or account generation changes discard the prior customer's state.

## Vendor audience and permissions

The Audience dashboard shows total followers, new followers over seven and thirty days, a real daily growth series, published announcements, and active follower campaigns. It intentionally reports no follower names, contacts, inferred conversions, views, clicks, or fabricated engagement metrics.

Owners, admins, and managers have `vendor:manage_audience`; ordinary staff and accountants do not. Managers can draft and submit content, but only the current shop's owner or admin can cross the review boundary and publish. All reads and writes derive the shop from the verified database membership, and every lifecycle transition is audit logged with vendor and actor scope. Publication mutations are rate limited.

Follower campaigns require the existing `ADVERTISING_ACCESS` capability from `VendorEntitlementService`. This does not consume or bypass paid sponsored-placement inventory: paid `PromotionCampaign` remains a separate purchase and fulfillment lifecycle. Announcements do not claim advertising placement. Selected and destination products are checked for current shop ownership and active/publication status.

## Publication lifecycle

The justified lifecycle is `DRAFT → IN_REVIEW → SCHEDULED or PUBLISHED → ARCHIVED/EXPIRED`. Drafts alone can be edited. Submission establishes a review boundary. Owner/admin approval publishes immediately unless `scheduledAt` is in the future. The existing authenticated cron advances due schedules and expiration. Archived, expired, draft, and in-review content is never feed eligible.

Every first publication creates exactly one `StorePublicationEvent`, keyed by both unique `publicationId` and stable `store-publication:{id}:published` event key. It records vendor ownership, `STORE_FOLLOWERS` targeting, and publication time. Its eligibility metadata explicitly records that delivery is disabled, marketing consent is required, and following alone is insufficient. An upsert makes scheduler retries idempotent.

## Activity feed

The feed merges published/active, non-deleted products with currently eligible `StorePublication` rows from active followed shops. Product IDs remain `product:{id}` and publication IDs are `publication:{id}`. Ordering is stable by publication timestamp and ID, newest first. Announcements and campaigns include shop attribution, optional image, and a validated product or storefront deep link. Draft, in-review, scheduled-not-due, archived, expired, and cross-vendor records are excluded. Web and Flutter render all three activity types; Flutter labels announcements and campaigns and renders optional campaign media.

## Notifications and privacy

Following never changes `UserSettings` marketing, newsletter, in-app promotional, recommendation, push, or follower-topic preferences. Customers separately control followed-store announcements, follower campaigns, and explicitly selected new-arrivals collections. All follower content additionally requires the existing in-app marketing consent; external delivery also requires push marketing consent, an active browser subscription or customer-scoped native device, and provider permission.

### Follower notification pipeline

`StorePublicationEvent` remains the stable publication identifier. The scheduled notification worker discovers eligible events and idempotently creates one `StorePublicationDispatch` per event. Dispatches use database compare-and-set claims, fixed follower batches, a persisted follow-ID cursor, bounded concurrency, exponential retries, stale-lock recovery, and terminal `FAILED` status after the configured attempt limit. An interrupted batch safely resumes; notification and push uniqueness keys make already-processed recipients no-ops.

Recipients are always resolved server-side from current `StoreFollow` rows. Vendors cannot provide recipient IDs. Before creating history, the worker verifies the active customer, current follow, active/approved/unexpired publication, active shop, topic and global in-app consent, campaign entitlement, and rolling frequency allowance. Before each external push dispatch, the existing outbox worker rechecks the current follow, shop, publication, account, global in-app/push consent, and topic consent. Unfollowing, withdrawing or expiring content, suspending a shop, or revoking consent therefore prevents subsequent dispatch.

Eligible records use the existing account-scoped `Notification` history and read/unread/dismiss APIs. They include vendor identity, follower event type, approved title/body, optional image, publication timestamp, and a validated product or storefront path. The existing `PushDeliveryOutbox`, `NativePushDelivery`, browser subscription versioning, FCM token invalidation, web service worker, and Flutter foreground/background/tap flows deliver the external channel; there is no duplicate service worker or transport.

New-product notifications are never inferred from product edits. A vendor must explicitly publish a reviewed `NEW_ARRIVALS` follower campaign with at least one owned active product.

### Operational configuration and rollout

- `FOLLOWER_NOTIFICATIONS_ENABLED=false` by default gates dispatch creation and in-app fan-out.
- `FOLLOWER_PUSH_ENABLED=false` by default independently gates all follower web/native push jobs.
- `FOLLOWER_NOTIFICATION_BATCH_SIZE` defaults to 100 and is clamped to 1–500.
- `FOLLOWER_NOTIFICATION_WORKER_CONCURRENCY` defaults to 2 and is clamped to 1–10.
- `FOLLOWER_NOTIFICATION_MAX_ATTEMPTS` defaults to 5 and is clamped to 1–10.
- `FOLLOWER_NOTIFICATION_DAILY_LIMIT` defaults to 3 and is clamped to 1–20 per customer over 24 hours.

The existing authenticated notification cron invokes follower fan-out before the shared push outbox. Logs record only dispatch IDs, failure categories, and sanitized exception types. No tokens, endpoints, customer contact data, or provider payloads are logged.

## Remaining work

- Qualify follower delivery on real Android devices and supported browsers in a non-production environment before enabling either rollout gate.
- Confirm FCM credentials, VAPID configuration, service-worker click handling, terminated-app navigation, and invalid-token revocation with test accounts.
- Establish operational alerting for stale, retrying, and failed follower dispatches before production activation.
- Decide whether platform moderators must approve selected vendor categories in addition to the implemented owner/admin review boundary.
- Add verified impression/click instrumentation before showing engagement or conversion metrics.
