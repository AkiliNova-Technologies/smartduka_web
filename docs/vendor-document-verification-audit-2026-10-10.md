# Vendor Documents & Verification Audit — 10 October 2026

## Outcome

The admin vendor details and shop-verification review interfaces now use the existing `Document`, `VendorDocument`, and `ShopVerificationApplication` records. No duplicate verification workflow or file record was introduced. A submission-reference table records which existing documents were reviewed for each application.

Mwezora is **not declared production-ready** by this report. Engineering gates pass, but live MTN payment routing remains subject to external provider certification and confirmation. Live routing was not enabled.

## Root causes

- `/admin/vendors` loaded only onboarding `VendorDocument` rows and omitted later shop-profile `Document` uploads.
- The admin sheet linked directly to stored URLs, including private object references.
- Shop-verification applications did not retain the exact document set submitted for review.
- Duplicate-active-application prevention existed only as a pre-insert application check and was race-prone.
- The rejected-application UI had no resubmission action even though the data model permitted a new case.
- KYC persistence actions trusted client-provided object references and metadata.
- Clean production builds depended on downloading Google fonts, and cached/PPR generation requires database network access.

## Implemented controls

- Added a centralized Documents & Verification section to admin vendor details with all document sources, upload/submission timestamps, status, current verification state, complete application history, decisions, rejection reasons, and secure preview/download actions.
- Added reciprocal links between vendor details and verification cases.
- Added secure admin and vendor document streaming routes. Authorization and tenant ownership are resolved from the current session and database; responses are private/no-store and never return storage credentials or raw private object references.
- Validated private KYC references against the canonical bucket, shop-owned path, UUID-style filename, allowed MIME types, object existence, and maximum size.
- Retained submitted records and prevented deletion of documents referenced by verification history.
- Added explicit required-document validation (business registration plus national ID or passport), explicit submission, rejected-case resubmission, admin notifications, and audit records.
- Added a database partial unique index for one active verification application per shop, preserving duplicate-click/concurrency safety.
- Kept shop verification separate from operational approval/suspension/banning and preserved the authoritative `verificationStatus` used by public/mobile verified-badge projections.
- Removed build-time Google Fonts network dependency while preserving Inter/Geist-first system font stacks.
- Limited static-generation concurrency for constrained release environments and made homepage merchandising degrade safely if a data source is temporarily unavailable.

## Migration

`20261010140000_verification_document_submissions`:

- creates `ShopVerificationDocument` references to existing `Document` or `VendorDocument` rows;
- enforces exactly one source per submission row and restricts deletion of reviewed records;
- backfills the best available document set for historical applications;
- creates a partial unique index across active verification states.

All 49 migrations applied successfully from an empty isolated PostgreSQL 17 database.

## Verification results

- Full Vitest suite: **675 passed, 6 skipped**. The six skips are the isolated advertising database tests.
- Isolated PostgreSQL advertising suite: **6 passed** after applying all 49 migrations.
- Added verification/document regressions: **18 passed** across storage-reference, tenant-isolation, secure-route, submission, decision, and migration-contract coverage.
- ESLint: **0 errors, 0 warnings**.
- TypeScript: passed (`tsc --noEmit`).
- Prisma validation: passed.
- Production build: passed; all **164** static/PPR pages generated.
- Real Chrome: production homepage and cookie-consent UI rendered successfully.
- Live unauthenticated document request: returned **401**.

## Remaining external/manual blockers

- External MTN provider certification/confirmation is still required. Live MTN routing remains disabled.
- Authenticated end-to-end browser review using disposable vendor and administrator accounts was not possible in this environment because no test credentials or isolated auth tenant were supplied. Direct API/service tests cover authorization, cross-vendor denial, submission, approval, rejection, and synchronization, but a credentialed staging smoke test remains recommended before deployment.
- Production/PPR builds need network access to the configured database. The final build passed with that access enabled.
