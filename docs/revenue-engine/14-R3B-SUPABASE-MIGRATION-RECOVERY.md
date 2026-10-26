# R3B Supabase migration recovery report

Date: 2026-10-18  
Migration: `20261018230000_verified_subscription_billing`  
Overall status: **RECOVERED AND VERIFIED**

## Root cause

The original R3B migration declared 13 identifier and foreign-key columns as PostgreSQL `UUID`, while Mwezora's referenced identifiers use `TEXT`. PostgreSQL rejected foreign-key creation with error `42804`, leaving a non-transactional partial schema and Prisma `P3018`. The corrected migration uses `TEXT`.

## Confirmed target

- Supabase project: `wqfsgjuedluwsvwzelal`
- Host: `aws-1-eu-west-1.pooler.supabase.com:5432`
- Database: `postgres`
- Schema: `public`
- Server: PostgreSQL 17.6
- Prisma migration datasource: `DIRECT_URL`

`DATABASE_URL` and `DIRECT_URL` were sanitized and compared without printing credentials. Both identify the same project, database, schema, and database user; `DIRECT_URL` uses the session-pooler migration port.

## Backup — EXECUTED AND VERIFIED

Managed backup inventory could not be queried because the workspace has no Supabase Management API token or authenticated CLI. Supabase documentation states that paid projects receive managed backups, but this was not treated as project-specific proof. A logical backup was therefore created before any schema mutation.

- Type: PostgreSQL custom-format logical archive (`pg_dump` 17.10, source PostgreSQL 17.6)
- Archive timestamp: 2026-10-18 19:28:56 UTC (22:28:56 Africa/Kampala)
- Location: `/home/albert-watbin/backups/mwezora/mwezora-wqfsgjuedluwsvwzelal-postgres-20261018T192855Z.dump`
- Location scope: outside the Git repository
- Permissions: `0600`; containing directory `0700`
- Size: 761,872 bytes
- Archive entries: 1,340
- SHA-256: `12f5e77038ea212d34e29db4c718c5814f10b4935f9a15521fe643bb85fa9eaa`
- Archive readability: `pg_restore --list` passed

### Restore test

A full restore attempt into stock PostgreSQL stopped safely because the Supabase-only `supabase_vault` extension is not installed locally. This does not indicate archive corruption; a full platform restore requires a Supabase-compatible target with its managed extensions.

The complete application `public` schema was then restored with `--single-transaction --exit-on-error --no-owner --no-privileges` into a fresh isolated PostgreSQL 17.10 cluster. The restore passed:

- 84 public base tables restored.
- `VendorProfile`: 4 rows.
- `Order`: 10 rows.
- `VendorSubscription`: 0 rows.
- `SubscriptionBillingIntent`: 0 rows.
- `SubscriptionPaidPeriod`: 0 rows.
- R3A restored as finished with one applied step.
- The pre-recovery R3B state restored as unfinished with zero applied steps.

### Restoration procedure

For an application-schema recovery into isolated PostgreSQL:

```bash
createdb restored_mwezora
pg_restore \
  --dbname="postgresql://postgres@127.0.0.1:<port>/restored_mwezora" \
  --schema=public \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  --single-transaction \
  /home/albert-watbin/backups/mwezora/mwezora-wqfsgjuedluwsvwzelal-postgres-20261018T192855Z.dump
```

For a complete project restoration, use a new Supabase-compatible PostgreSQL target and follow Supabase's backup/restore process so managed schemas and extensions, including `supabase_vault`, exist. Do not restore this archive over the active project without a separately approved disaster-recovery plan.

## Live preflight — VERIFIED

Immediately before repair:

- R3A was finished and R3B was failed; no later migration existed.
- Both partial R3B tables existed and contained zero rows.
- All 13 identifier columns were `UUID`; none was `TEXT`.
- All 11 intended foreign keys were absent.
- The obsolete unique lifecycle-intent index was present.
- Protected counts matched the restored backup: 4 vendor profiles and 10 customer orders.

## Schema recovery — EXECUTED AND VERIFIED

The guarded `docs/revenue-engine/20261018230000-supabase-recovery.sql` script executed successfully using `DIRECT_URL` and `ON_ERROR_STOP=1`.

The script:

- Ran in one transaction and locked only the two R3B tables.
- Confirmed both tables were empty before alteration.
- Converted exactly 13 identifier columns from `UUID` to `TEXT`.
- Added exactly 11 foreign keys.
- Replaced the obsolete lifecycle-intent unique index with `SubscriptionBillingIntent_lifecycleIntentId_createdAt_idx`.
- Did not modify `_prisma_migrations`.
- Did not drop or truncate tables.

Post-repair verification confirmed:

- 13/13 identifier columns are `TEXT`.
- 11/11 foreign keys exist and are validated.
- All intended R3B indexes exist; the obsolete index is absent.
- Both billing tables remain empty.
- `VendorProfile` remains at 4 rows and `Order` remains at 10 rows.

## Prisma migration resolution — EXECUTED AND VERIFIED

Prisma's supported command marked R3B applied after schema verification. History now contains:

- Original checksum `54d4b7...`: unfinished and rolled back.
- Corrected checksum `73a848...`: finished and not rolled back.

`npx prisma migrate status` reports 65 migrations and: `Database schema is up to date!`

No migration record was edited manually. No `migrate deploy`, `migrate reset`, or `db push` was run against Supabase.

## Integrity and regression results

- Live R3B migration-integrity gate: passed.
- Prisma schema validation: passed.
- TypeScript (`tsc --noEmit`): passed.
- ESLint: passed.
- Revenue regression suite: 60/60 passed.
- Disposable R3B recovery validator: passed.
- Complete disposable migration replay: 65/65 migrations applied.
- Revenue database integration suites: 47/47 passed.

No real MTN payment was initiated. Production quota enforcement was not enabled.

## Files changed

- `docs/revenue-engine/14-R3B-SUPABASE-MIGRATION-RECOVERY.md`
- `scripts/run-revenue-entitlement-db-tests.mjs`
- `scripts/validate-r3b-migration-integrity.sql`
- `docs/revenue-engine/README.md`

## Remaining risks

- The logical archive's application schema is restore-tested. A full stock-PostgreSQL restore requires Supabase-specific extensions; a complete disaster recovery should target a Supabase-compatible project.
- Project-specific managed backup availability is still unknown because Management API access was unavailable. The verified logical archive is the recovery point for this operation.
- Repository-wide Prisma drift previously reported outside R3B remains separate follow-up work. The R3B integrity gate intentionally validates the exact billing contract and complete migration replay without altering unrelated historical objects.
- Storage API object contents are not included in PostgreSQL logical backups; only database metadata is present.

## Production readiness and next phase

R3B database recovery is complete. The corrected billing schema and Prisma history are consistent, but this does not qualify production MTN charging or activate quota enforcement. Preserve the backup until a post-recovery retention decision is explicitly made. Address broader historical drift and production payment qualification as separate reviewed work before proceeding beyond R3B.
