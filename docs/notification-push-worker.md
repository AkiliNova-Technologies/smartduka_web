# Notification push worker

The production notification worker is exposed as `GET /api/cron/push-delivery`.
Vercel authenticates it with `Authorization: Bearer <CRON_SECRET>`. The route
must fail closed when `CRON_SECRET` is absent or does not match.

One invocation runs these stages in order:

1. Publish or expire due platform announcements.
2. Publish or expire due marketing notification campaigns.
3. Fan out published announcement dispatches.
4. Fan out published marketing dispatches with consent and frequency checks.
5. Claim due push outbox jobs and independently attempt native Android and
   Browser Web Push delivery.

The durable dispatch cursors, outbox locks, idempotency keys, per-device native
delivery rows, bounded retries, expiry checks, account status, audience rules,
and marketing consent checks remain authoritative. Vercel does not retry a
failed cron invocation; later invocations recover stale locks and due retries.

`vercel.json` requests a five-minute cadence. Vercel Hobby only supports daily
cron execution, which is not suitable for timely push delivery. Confirm that
the production project is on a plan supporting this cadence before deployment.
Do not add a separate fanout schedule: the outbox worker already performs both
fanout stages before delivery.

## Production release gate

Before deploying a schedule for the first time:

- Confirm `CRON_SECRET`, Firebase Admin configuration, encryption-key
  continuity, and `NATIVE_PUSH_ENABLED` in the production environment.
- Check Vercel Cron Jobs for an existing external or dashboard-managed worker
  to avoid duplicate scheduling.
- Review all pending announcement and marketing dispatch content, audience,
  consent class, and expiry. Deployment immediately activates the checked-in
  schedule for production deployments.
- Review pending outbox jobs. Do not edit, replay, or delete them merely to
  make a test easier.

The existing browser test endpoint targets a verified browser subscription.
There is currently no equivalent Android-only test job and no safe per-job cron
claim endpoint. Therefore a native test cannot be isolated from older due jobs
without a schema-backed target-device extension. For the first controlled
Android test, approve or allow existing eligible dispatches to expire, verify
that no unrelated deliverable backlog remains, create one normal authorized
notification for the test account, and then allow the scheduled worker to run.
