import { describe, expect, it } from "vitest";
import { sanitizeUserSettingsPayload } from "@/services/settings";

describe("customer settings payloads", () => {
  it("rejects ownership and privilege fields", () => {
    expect(() => sanitizeUserSettingsPayload({ userId: "user-b" })).toThrow(
      "Unsupported settings field: userId",
    );
    expect(() =>
      sanitizeUserSettingsPayload({ platformRole: "ADMIN" }),
    ).toThrow("Unsupported settings field: platformRole");
  });

  it("accepts only supported preference fields", () => {
    expect(
      sanitizeUserSettingsPayload({
        fullName: "User A",
        marketingNewsletter: true,
      }),
    ).toEqual({ fullName: "User A", marketingNewsletter: true });
  });
});
