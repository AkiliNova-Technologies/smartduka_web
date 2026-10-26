# R2C — Vendor entitlement experience and acceptance

Status: implemented behind the existing entitlement boundary. Production quota enforcement remains disabled by default.

## Experience contract

The subscription page reads the authenticated vendor's authoritative entitlement snapshot from `GET /api/v1/vendor/entitlements`. It presents the resolved plan and lifecycle state, paid-period or trial dates, server-calculated trial days remaining, resource use, and capability modes. A pending payment is informative only and never grants access.

The approved comparison is limited to the versioned policy facts: Starter/Growth/Premium prices; 100/1,000/fair-use product capacity; 1/5/20 branches; 2/10/30 non-owner staff; tiered insights; branch inventory; and CSV export. It makes no advertising-credit, placement, or support-SLA promise.

Products, locations, and team settings reuse the same entitlement hook and resource-usage component. Finite limits expose an accessible progress indicator and near-capacity guidance. A `null` Premium product limit is displayed as expanded fair-use capacity and never enters percentage arithmetic.

The browser client uses `cache: "no-store"`, aborts superseded requests, and keeps no module-global shop snapshot. Account changes therefore cannot reuse the previous shop's entitlement state.

## Acceptance environment

Run:

```bash
npm run test:revenue-entitlement-browser
```

The guarded runner creates a disposable loopback PostgreSQL cluster, replays every migration, seeds two active vendor owners and immutable Starter/Growth plan versions, creates paid platform orders without contacting a provider, starts the Firebase Auth Emulator and an isolated Next.js development output directory, then runs authenticated Playwright checks in desktop and mobile projects.

Coverage includes authoritative plan and usage rendering, plan comparison, product/location quota visibility, account switching, light/dark accent behavior, and horizontal-overflow checks. The fixture refuses any database without the isolated marker, loopback host, and expected disposable database name.

## Safety and rollout

- `VENDOR_QUOTA_ENFORCEMENT_ENABLED=false` remains the repository default.
- The acceptance runner enables enforcement only inside its disposable process environment.
- No test starts a real subscription payment or calls a production payment provider.
- Production activation still requires provider qualification and an explicit staged rollout decision.
