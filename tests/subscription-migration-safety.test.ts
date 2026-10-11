import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("prisma/migrations/20261010090000_vendor_subscription_phase3/migration.sql", "utf8");

describe("subscription plan code migration", () => {
  it("keeps the already-deployed backfill null-only and non-destructive", () => {
    expect(migration).toContain('WHERE "code" IS NULL');
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"SubscriptionPlan"/i);
    expect(migration).not.toMatch(/DROP\s+TABLE/i);
  });
});
