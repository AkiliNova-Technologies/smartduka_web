# Payment reconciliation operations

The marketplace reconciliation worker polls unresolved direct-payment intents. It never initiates a payment and never accepts a client assertion as proof of success. Production customer-payment providers remain disabled.

## Scheduler

Vercel invokes `GET /api/cron/payment-reconciliation` every five minutes. The route fails closed unless `CRON_SECRET` matches in constant time and `SCHEDULED_PAYMENT_RECONCILIATION_ENABLED=true`. Batch size, concurrency, and execution time are bounded by the `PAYMENT_RECONCILIATION_*` settings. Leave the worker disabled until the deployment secret and sandbox/provider qualification environment have been verified.

Each eligible intent is claimed through `nextReconcileAt` before a provider lookup. A crashed worker's lease expires after two minutes. Callback, polling, and administrative rechecks all pass through the same provider-event ledger and conditional state transition.

## Charged but order remains unpaid

1. Record the customer's order number and approximate payment time. Do not request a token, PIN, authorization header, full provider reference, or provider credentials.
2. In the admin payment operations view, locate the order and verify the customer, vendor suborder, amount, currency, provider, masked reference, current status, reconciliation attempts, and last checked time.
3. Review the payment timeline for amount/currency/reference mismatch, duplicate observations, provider outage, reversal, or a pending result. Never use customer screenshots alone as authoritative payment evidence.
4. If the intent is pending and has a provider reference, use the existing authorized recheck action or allow the scheduled worker to query the provider. Do not initiate another collection while the outcome is unresolved.
5. If provider status is unavailable, retain `PENDING`, document the incident, and escalate to the provider with its approved non-secret support reference. A timeout is not failure.
6. If an authoritative result is successful, reconciliation will update only that vendor suborder's intent and will complete the parent payment only after every vendor suborder is paid. If the provider reports reversal, keep fulfilment history and escalate for review.
7. Escalate intents older than 24 hours or with 12 reconciliation attempts. Include intent ID, order/suborder IDs, provider, masked reference, attempt count, timestamps, and sanitized error classification.

There is intentionally no force-success operation. Database edits, replaying provider calls, or changing a payment destination are not approved recovery procedures.
