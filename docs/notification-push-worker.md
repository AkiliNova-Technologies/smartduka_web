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

`vercel.json` requests `0 6 * * *`, a once-daily Hobby-compatible cadence at
approximately 06:00 UTC. Hobby invocation may occur at any point during that
hour. Do not add a separate fanout schedule: the outbox worker already performs
both fanout stages before delivery. Set
`SCHEDULED_NOTIFICATION_WORKER_ENABLED=true` only after the backlog review;
until then, authenticated cron calls return a disabled result without processing
dispatches or outbox jobs.

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

## Controlled Android testing

`POST /api/admin/notifications/native-test` provides an isolated development
test without invoking the scheduled worker. It is disabled unless
`NATIVE_PUSH_MANUAL_TEST_ENABLED=true`, requires an authenticated active account
with `platform:manage_announcements`, enforces same-origin POST requests and a
three-per-hour rate limit, and accepts only `{ "requestId": "<uuid>" }`.

The fixed test job belongs to the invoking administrator and targets only that
account's enabled Android devices. The caller cannot supply another account,
device, title, body, or destination. The job uses the normal encrypted-token,
outbox, native-delivery, FCM, retry, and idempotency pipeline. Its claim is by
exact job ID and owner, so unrelated queued jobs and announcement fanout are not
processed. Reusing the request UUID returns or retries the same durable job.

Keep the manual test flag disabled outside explicitly approved testing. Disable
it again after qualification.

## Pro migration

After upgrading the Vercel project to Pro, change only the schedule in
`vercel.json` to `*/5 * * * *`. Keep the same endpoint, `CRON_SECRET`, worker
service, feature gates, and delivery semantics.
