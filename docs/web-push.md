# PWA Web Push deployment

Mwezora's in-app notification records remain authoritative. Browser push is a best-effort secondary channel processed from the PostgreSQL outbox by the authenticated platform cron endpoint.

Set these deployment secrets before turning it on:

```bash
WEB_PUSH_ENABLED=true
WEB_PUSH_VAPID_PUBLIC_KEY=...
WEB_PUSH_VAPID_PRIVATE_KEY=...
WEB_PUSH_VAPID_SUBJECT=mailto:security@example.com
WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY=...
```

Generate VAPID keys once outside the running app with `npx web-push generate-vapid-keys`. Generate the encryption key as a base64-encoded 32-byte random value in the deployment secret manager. Do not rotate either key at runtime, commit either secret, or expose the private/encryption keys to the browser.

The worker runs through `POST /api/cron/platform-revenue` under the existing cron identity. It processes at most 25 outbox jobs per run and uses up to five attempts with exponential backoff. HTTP 404 and 410 responses revoke an endpoint; only server-side hashes and AES-GCM encrypted endpoint/key material are stored.

Support requires HTTPS, Service Workers, Push API and browser notification permission. iOS/iPadOS requires iOS 16.4+ and an installed Home Screen web app. Browser push is unavailable in unsupported browsers or when deployment configuration is incomplete.
