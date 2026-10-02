import { describe, expect, it } from "vitest";
import { humanizeOperation, shortReference } from "@/lib/admin-operations";

describe("Admin operations display mappings", () => {
  it.each([
    ["READY_FOR_PROVIDER_REFUND", "Ready For Provider Refund"],
    ["RESOLVED_CUSTOMER", "Resolved Customer"],
    ["VENDOR_EARNINGS", "Vendor Earnings"],
    ["ACCOUNT_TAKEOVER_SUSPECTED", "Account Takeover Suspected"],
    ["SUBMISSION_UNKNOWN", "Submission Unknown"],
  ])("humanizes %s", (value, expected) => expect(humanizeOperation(value)).toBe(expected));
  it("de-emphasizes long identifiers", () => expect(shortReference("12345678-1234-5678")).toBe("12345678…"));
});
