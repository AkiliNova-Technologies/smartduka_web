# SmartDuka mobile V1 API readiness audit

Audited 2026-10-05. The web application is the source of truth: route handlers and server actions delegate to `ProductService`, `OrderService`, `VendorService`, `VendorTeamService`, `MarketplaceReportService`, `ShopVerificationService`, and payment/fulfilment services backed by Prisma.

## Authentication and authority

Web uses a signed httpOnly SmartDuka session cookie created after Firebase ID-token verification. V1 adds `resolveAuthenticatedUser()` in `src/lib/auth/session.ts`: it accepts the existing cookie/session path, an existing signed SmartDuka bearer token, or a Firebase ID token in `Authorization: Bearer`. Firebase identity is synchronized to the existing `User`/`Account` model; user active state and all vendor membership/permissions are read from the database. Client IDs, vendor IDs, role claims, pricing, stock, and totals are never authoritative.

## Capability matrix

| Capability | Classification | Reused implementation / V1 route | Work remaining |
| --- | --- | --- | --- |
| Authentication/profile/mode discovery | READY | Firebase sync, session guards; `/me` | Token refresh stays Firebase SDK responsibility. |
| Marketplace home/categories | READY | category/product/vendor services; `/marketplace/home`, `/categories` | Promotions are omitted because placement data is not yet mobile-composed. |
| Products, variants, filters, search | READY | `ProductService`; `/products`, `/products/:id-or-slug`, `/search` | Add database count query for exact filtered totals. |
| Public shops/verification | READY | public shop DTO/service; `/shops`, `/shops/:slug` | ID lookup currently uses public slug only. |
| Wishlist | READY | `WishlistService`; `/wishlist` | Product existence error could be made more specific. |
| Cart | DEFERRED_BY_DESIGN | browser/local mobile persistence | V1 cart remains local and persists only product/variant IDs and quantities. Checkout revalidates catalogue, stock, prices, and fulfilment server-side; no server cart model exists. |
| Checkout/orders/payments | READY | `OrderService`; `/checkout`, `/orders`, `/orders/:id/payment-status` | Payment-status adapter normalizes terminal/pending state; PesaPal initiation remains existing web route. |
| Notifications | READY | notification adapters; `/notifications` | Push delivery remains a provider concern; device lifecycle is available through `/devices`. |
| Marketplace reports | READY | `MarketplaceReportService`; `/marketplace-reports` | Add rate limit/idempotency key when external abuse controls are available. |
| Vendor context/orders | READY | vendor context + order services; `/vendor/context`, `/vendor/orders` | Add dedicated order-detail GET projection. |
| Vendor products | READY | `ProductService`; `/vendor/products` and `/vendor/products/:id` | Strict V1 mutation schemas reject protected fields. Product creation is explicitly non-idempotent: mobile clients must not auto-retry POST. |
| Inventory/low stock | READY | `VendorInventoryService`; `/vendor/inventory`, `/vendor/inventory/adjustments` | Atomic guarded decrements prevent negative stock; variant products require a variant target. |
| Vendor dashboard/analytics | READY | `VendorMobileInsightsService`; `/vendor/dashboard`, `/vendor/analytics` | Revenue is completed, delivered vendor totals only. |
| Vendor shop profile | READY | `/vendor/shop` | Public shop fields only; payout, KYC, and verification fields are not writable. |
| Vendor team | READY (read) | `VendorTeamService`; `/vendor/team` | Owner-only mutations intentionally not exposed yet. |
| Verification | READY (read) | `ShopVerificationService`; `/vendor/verification` | Submission/info response remains existing web API. |
| Media | READY | `/uploads` signed upload authorization | Asset references are restricted to the authenticated vendor's purpose-specific `marketplace-media` prefix; no storage credentials are returned. |
| Device registration/push | READY | `/devices` | Device-token lifecycle is implemented; provider delivery remains deferred. |

## Transport contract

V1 success uses `{ data }`; paginated results include `{ meta: { page, pageSize, total, hasMore } }`; errors use `{ error: { code, message, fields? } }`. Public routes are cacheable; authenticated routes set `private, no-store`. Page size is capped at 50. Zod request contracts live in `src/lib/api/v1/contracts.ts`.

## Security and retry rules

GET is retry-safe. Checkout is idempotent via `Idempotency-Key`/`checkoutRequestId` and the pre-existing order request hash. Product creation is intentionally non-idempotent: clients must surface the result and must not automatically retry a timed-out POST; the canonical product service does not yet have a durable request-key store. Browser cookies retain their current CSRF posture; native bearer auth does not trust Origin and must use HTTPS in production.

## Final capability matrix

| Capability | Status |
| --- | --- |
| Auth | READY |
| Catalogue | READY |
| Shops | READY |
| Wishlist | READY |
| Local cart contract | READY |
| Checkout | READY |
| Payment status | READY |
| Orders | READY |
| Notifications | READY |
| Reports | READY |
| Device registration | READY |
| Uploads | READY |
| Vendor context | READY |
| Vendor dashboard | READY |
| Vendor analytics | READY |
| Vendor shop | READY |
| Vendor products | READY |
| Vendor inventory | READY |
| Vendor payouts | READY |
| Vendor verification | READY |
