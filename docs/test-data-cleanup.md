# Test data cleanup

## Audit and dependency inventory

The previous cleanup path existed only in `scripts/seed-test-marketplace.js`. It identified fixtures from configured emails and known slugs, then refused to run if it found any customer orders, product order items, or vendor ledger entries. It did not expose an admin preview, traverse the schema, distinguish simulated from real finance, prevent overlapping jobs, persist progress, or queue uploaded-file deletion. Firebase identities were deleted after the database transaction, so a Firebase failure could leave an external identity behind. The script's narrow checks also did not account for most restrictive foreign keys.

The Prisma schema currently contains these cleanup domains:

- Identity: `Account`, `Session`, `User`, `UserDevice`, `UserSettings`, `WishlistItem`, `RecentlyViewed`, and `Notification`.
- Vendor and verification: `VendorApplication`, `VendorDocument`, `VendorProfile`, `ShopVerificationApplication`, `ShopVerificationDocument`, `ShopVerificationActivity`, `ShopVerificationNote`, `VendorPaymentAccount`, `VendorPayoutAccount`, and `VendorSubscription`.
- Catalogue and reviews: `ProductCategory`, `Product`, `ProductImage`, `ProductVariant`, `FeaturedProduct`, `FeaturedShop`, `ProductReview`, `ShopReview`, `ReviewReply`, and `ReviewReport`.
- Orders and after-sales: `Order`, `SubOrder`, `OrderItem`, `ReturnRequest`, `ReturnItem`, `Refund`, `RefundItem`, `Dispute`, and `RiskFlag`.
- Payments and accounting: `PaymentIntent`, `PaymentProviderEvent`, `PaymentAttempt`, `FinancialLedger`, `VendorPayout`, `VendorPayoutAllocation`, `PlatformRevenueOrder`, `PlatformPaymentIntent`, `ReconciliationFinding`, and `PaymentGatewayWebhookLog`.
- Marketing: `Promotion`, `PromotionCreditLedger`, `PromotionCampaign`, `PromotionReservation`, and `PromotionQuote`.
- Moderation and evidence: `MarketplaceReport`, `MarketplaceReportActivity`, `MarketplaceReportNote`, `Document`, and `AuditLog`.

Important restrictive edges include order-to-customer, payment-to-order/suborder/vendor/account, ledger-to-order/payment/refund/payout, return/refund items to order items, dispute relations, payout allocations, platform revenue payments, report activity/note history, and verification-document submissions. Cascades alone were insufficient because the financial graph deliberately uses `RESTRICT` in many places. Categories and uploaded objects can be shared and therefore cannot be assumed to belong to a selected shop.

`ReconciliationFinding` and `PaymentGatewayWebhookLog` contain logical references rather than database foreign keys. They must be explicitly registered and are treated as retained operational evidence. Firebase identities have no database foreign key, so deletion is queued only when their provider identity is separately and explicitly recorded on the verified registry entry.

## Architecture and safety rules

`TestDataBatch` is the review boundary. `TestDataRegistry` records explicit entity ownership and a mandatory financial disposition. A batch starts as `DRAFT` and only `VERIFIED` batches are eligible. Production registration is denied unless `ALLOW_PRODUCTION_TEST_DATA_REGISTRATION=true`; independent review is mandatory there. Names, emails, slugs, and text are never eligibility signals.

The preview service starts from registry records, reads PostgreSQL foreign-key metadata, and traverses incoming dependencies. Cascade-owned non-financial children can be proven from their exclusive parent relation. Restrict/no-action children must be explicitly registered. `SET NULL` dependents remain protected unless they were already selected through the verified registry. Financial rows must be explicitly `SIMULATED`; unknown, real, or `PROTECTED` rows block execution. Webhook and reconciliation evidence is never hard-deleted by this workflow.

The server stores the full plan and its SHA-256 fingerprint in `TestDataCleanupJob`. Plans expire after ten minutes. Execution reacquires the active SUPER_ADMIN identity, takes a PostgreSQL advisory transaction lock, rebuilds the dependency graph, rejects changed or blocked plans, and deletes children before parents in a serializable transaction. The client sends only the opaque plan ID and exact confirmation phrase. It cannot supply trusted counts or entity lists.

Storage references are accepted only for the two configured buckets and approved path prefixes. The planner detects database-shared objects. Eligible objects become durable `StorageCleanupTask` rows only after relational deletion succeeds. Explicitly registered Firebase ownership becomes an `ExternalIdentityCleanupTask`; a user ID alone never authorizes external identity deletion. The cron worker rechecks file references, claims tasks atomically, treats an already-absent Firebase identity as idempotent success, and retries failures with bounded exponential backoff. Database rollback is not claimed for already committed external operations.

## Deployment and operations

1. Back up and test restore procedures before applying the migration.
2. Apply `20261011120000_test_data_cleanup_registry` and deploy the application code together.
3. Set `TEST_DATA_ENVIRONMENT` explicitly. Leave both production policy flags false by default.
4. Configure `CRON_SECRET` and schedule `POST /api/cron/test-data-storage-cleanup` with `Authorization: Bearer <secret>`.
5. Register legacy records through the draft-batch API, review every entity and financial classification, then have an authorized reviewer verify the batch. Never bulk-classify records from names or email domains.
6. Monitor failed cleanup jobs, stale plans, protected records, and failed storage tasks. A completed database job with failed storage tasks is recoverable by retrying the worker; it is not a partially rolled-back database job.

Current limitations: genuine finance is blocked rather than automatically anonymized; logical references without foreign keys must be explicitly registered; and this first release executes one atomic database plan rather than splitting very large graphs into committed batches. Large plans should be divided into reviewed batches until a durable checkpointed batch executor is added.
