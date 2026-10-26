# Mwezora feature and module matrix

Definitions: **Implemented** means meaningful code/core workflow exists. **Partial** means a required workflow or validation remains. **Blocked** means an external provider/environment is required. **Missing** means no meaningful implementation was found. **Production ready** is reserved for implementation plus security, end-to-end and operational evidence; no major domain currently meets that bar.

| Module / feature | Status | Primary sources / models | Routes and tests | Remaining evidence or work |
| --- | --- | --- | --- | --- |
| Identity/session/account switching | Implemented, not production ready | `src/lib/auth/session.ts`, `src/services/auth-sync.ts`; `User`, `Account`, `Session` | `/api/auth`, `/api/auth/sync`; `active-session-authorization`, `jwt-lifecycle`, `auth-sync` | Browser test account switching, cached provider reset, guest cart isolation |
| Homepage/hero/discovery | Implemented | `src/components/home`, `src/lib/marketplace-page.ts`; `Promotion`, `FeaturedProduct`, `FeaturedShop` | `/`; home/featured/fallback contract tests | Full browser/accessibility/performance acceptance |
| Catalogue/search/categories | Implemented | `src/services/product.ts`, `category.ts`, variants; `Product`, `ProductVariant`, `ProductCategory` | `/products`, `/categories`, `/api/products`, `/api/v1/search`; broad tests | Exact filtered mobile counts and load/query-plan evidence |
| Product recommendations/recently viewed | Implemented | `src/services/recommendations.ts`, `recently-viewed.ts`; `RecentlyViewed` | product detail, `/api/recently-viewed`; recommendation tests | Cross-account browser verification |
| Wishlist | Implemented | `src/services/wishlist.ts`; `WishlistItem` | `/wishlist`, `/api/v1/wishlist`; wishlist contracts | Auth browser acceptance |
| Cart | Partial | `src/providers/UserDataProvider.tsx`; no Cart model | `/cart`; checkout UI contracts | Local-only; cross-device persistence absent; switching isolation test |
| Coupons/discounts/tax | Missing/partial | `src/data/mockDatabase.ts`; order calculation | `/coupons` | Replace mock coupons; implement authoritative discount/tax policies (`order.ts:290-303`) |
| Multi-vendor checkout | Implemented, blocked for production payment | `src/services/order.ts`, fulfillment/payment services; `Order`, `SubOrder`, `OrderItem` | `/checkout`, `/api/v1/checkout`; checkout/order/DB tests | Authenticated E2E and live provider routing |
| Customer orders/cancellation/refunds | Implemented | `order.ts`, `returns-refunds.ts`; order/refund/return models | `/orders`; acceptance spec and extensive contracts | Run isolated DB/browser suite; operational refund provider evidence |
| Customer profile/settings/notifications | Implemented | settings/notification services; `UserSettings`, `Notification` | `/settings`, `/notifications`, `/api/v1/*` | Saved address book absent; account-switch browser acceptance |
| Vendor application/onboarding | Implemented | `src/services/vendor.ts`, verification documents; `VendorApplication`, `VendorDocument` | `/become-seller`, `/api/vendors/apply`; KYC auth/tests | Authenticated browser acceptance and storage scan policy |
| Shop verification/moderation | Implemented | `shop-verifications.ts`, `shop-moderation.ts`; verification models | vendor/admin verification pages/APIs; many contracts | One current UI contract failure; isolated browser lifecycle |
| Vendor dashboard/analytics | Implemented | vendor/mobile insights services | `/vendor`, `/api/v1/vendor/dashboard|analytics`; UI tests | Production data/performance validation |
| Products/variants/inventory | Implemented | product/vendor inventory services; product/variant models | vendor product/inventory routes; extensive tests | Isolated concurrent browser/DB acceptance |
| Vendor orders/fulfillment | Implemented | `vendor-orders.ts`, `payment-fulfillment.ts` | vendor order routes; auth/fulfillment tests | Authenticated multi-role browser flow |
| Vendor team/RBAC | Partial | `vendor-team.ts`, DB membership/permissions | web `/vendor/settings/team`, V1 read | Mobile mutations absent; multi-shop memberships unsupported |
| Branch CRUD | Partial | `shop-branches.ts`; `ShopBranch` | V1 branch routes; multi-branch tests | No delete/archive workflow; primary invariant DB enforcement |
| Branch inventory | Implemented | `branch-inventory.ts`, `inventory-integrity.ts`; inventory/movement models | V1 inventory routes; DB integration test | Run DB suite; operational reconciliation UI |
| Branch transfers | Missing | no transfer service/model/API/UI | none | Atomic paired movements, idempotency, authorization, tests |
| Marketplace payment ledger | Implemented core, blocked provider | `payment-intent.ts`, reconciliation; payment models | callbacks/cron/admin; payment tests | Provider-certified live direct settlement |
| MTN customer payment | Sandbox implemented / production blocked | `mtn-momo-provider.ts` | MTN callback and sandbox tests/scripts | Production vendor destination mapping and certification |
| Airtel customer payment | Missing / blocked | `airtel-money-provider.ts` | none meaningful | Obtain API contract; implement initiation/status/callback/reconciliation |
| Returns/refunds/reversals/disputes | Implemented core | `returns-refunds.ts`, `disputes-risk.ts`; related models | customer/vendor/admin APIs; phase3 tests | Real provider reversal/refund and operational E2E |
| Vendor payment/payout accounts | Implemented | account/payout/crypto services; payment/payout account models | vendor/admin routes; tests | Production KMS/secret rotation and payout-provider qualification |
| Subscription plans/trials/entitlements | Implemented core, blocked payment/ops | subscription services/scheduler; plan/subscription models | `/vendor/subscription`; contract tests | Run isolated DB E2E, schedule worker, qualify platform MTN |
| Advertising quotes/credits/capacity | Implemented core, blocked payment/ops | promotion services/inventory/scheduler; campaign/reservation models | vendor/admin marketing routes; DB/contract tests | Run destructive isolated DB and browser tests; platform payment qualification |
| Sponsored rendering/fallback | Implemented | marketing routes/home components | homepage; placement/home tests | Browser verify exactly 2+2 and fallback |
| P0 in-app notifications | Implemented | `notifications.ts`; `Notification` | notification APIs/pages; P0 contracts | Authenticated browser/account switch acceptance |
| P1 announcements | Implemented core | `announcements.ts`; `Announcement*` | admin/V1 routes; contracts | Scheduler deployment and browser acceptance |
| P2 marketing notifications | Implemented core | `marketing-notifications.ts`; marketing models | admin routes; contracts | Consent/frequency runtime acceptance |
| P3 browser push infrastructure | Implemented core, blocked environment | subscription encryption/outbox; push models | V1 push routes; DB/contracts | VAPID/config, HTTPS, real device testing |
| Transactional/announcement/marketing push | Implemented core, unverified | push/announcement/marketing services | cron worker, tests | Real OS-level category acceptance and delivery reporting validation |
| Admin RBAC/workspaces | Implemented, partial audit coverage | admin context/permissions/services; `AuditLog` | `/admin/**`, `/api/admin/**`; auth tests | Central audit policy; one verification UI test failure |
| Test-data cleanup | Implemented with safeguards | cleanup services/models | admin cleanup routes; safety/worker tests | Isolated operational rehearsal only |
| Mobile API V1 | Broadly implemented | `src/app/api/v1`, contracts/services | V1 route tests | Flutter/external app separate audit; client contract regression run |
| PWA/offline/install | Implemented core | `manifest.ts`, `sw.js`, icons/offline | PWA tests | Lighthouse/install acceptance on Android/iOS; real push |
| Design system/branding | Partial | `src/components/ui`, brand components, CSS | contract tests | 3 UI contract failures; remove user-facing SmartDuka remnants |
| Deployment/operations | Partial/not ready | Next config, env example, runbooks | build scripts | Scheduler, health, monitoring, logs, rollback, restore evidence |

## External integrations

| Dependency | Purpose | State |
| --- | --- | --- |
| PostgreSQL | transactional source of truth | Integrated; current clean migration replay not rerun |
| Firebase Auth/Admin | browser/native identity and sync | Integrated; production configuration/runtime unknown |
| Supabase Storage | marketplace media/private KYC | Integrated; production bucket/RLS/scan configuration unknown |
| MTN MoMo marketplace | customer-to-vendor collection | Sandbox code only; production routing blocked |
| Airtel Money | customer-to-vendor collection | Adapter intentionally unavailable; blocked by contract |
| MTN MoMo platform | subscription/ad collection | Code and qualification scripts; production disabled/unverified |
| Pesapal | historical payment reconciliation | Implemented legacy path; disabled for new checkout by default |
| Web Push/VAPID | browser push | Implemented; deployment/device evidence absent |
| Resend | dependency present | No repository-wide production delivery qualification found |
| Vercel Analytics | client analytics | Dependency present; production observability is not established |

## Flutter boundary

No Flutter application is present. The API contract is implemented here, but any Flutter UI, secure token storage, cart behavior, deep links, push token lifecycle and client-version compatibility must be audited in its own repository.
