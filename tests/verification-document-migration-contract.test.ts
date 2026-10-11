import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("prisma/migrations/20261010140000_verification_document_submissions/migration.sql", "utf8");

describe("verification document migration", () => {
  it("retains documents by reference and enforces exactly one source", () => {
    expect(migration).toContain('CREATE TABLE "ShopVerificationDocument"');
    expect(migration).toContain('"ShopVerificationDocument_exactly_one_source_check"');
    expect(migration).toContain("ON DELETE RESTRICT");
  });

  it("prevents concurrent duplicate active verification cases at database level", () => {
    expect(migration).toContain('"ShopVerificationApplication_one_active_per_vendor_key"');
    expect(migration).toContain("WHERE \"status\" IN ('PENDING', 'UNDER_REVIEW', 'NEEDS_INFORMATION')");
  });
});
