# Database recovery release gate

Mwezora's schema can be rebuilt from an empty PostgreSQL database by applying all Prisma migrations in order. The release-hardening run applied all 48 migrations successfully to a disposable PostgreSQL 17 cluster before running the advertising concurrency suite.

That migration result is not evidence that production data can be recovered. Before a production launch, the database owner must record and verify:

1. the managed database backup/PITR feature is enabled and its retention period;
2. named owners for backup alerts and recovery execution;
3. approved recovery point and recovery time objectives;
4. a restore drill into a separate, non-production project/database;
5. row-count and integrity checks for users, vendors, products, orders, payment intents, platform revenue orders, promotion campaigns, reservations, and credit ledgers;
6. storage-bucket recovery/retention for marketplace media and KYC documents;
7. the drill date, restored backup timestamp, measured recovery time, and sign-off.

Never test restore procedures against the active staging or production database. Never use the advertising integration-test reset routine for recovery validation.

Production readiness remains blocked until a restore drill has passed and its evidence is retained outside the application repository.
