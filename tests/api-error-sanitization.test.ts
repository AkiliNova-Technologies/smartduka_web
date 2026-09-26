import { describe, expect, it } from "vitest";
import { getErrorMessage } from "@/lib/api-utils";

describe("public API error handling", () => {
  it("does not expose database or Prisma implementation errors", () => {
    expect(
      getErrorMessage(new Error("Invalid `prisma.user.findUnique()` invocation")),
    ).toBe("An unexpected error occurred.");
    expect(
      getErrorMessage(Object.assign(new Error("query failed"), { name: "PrismaClientKnownRequestError" })),
    ).toBe("An unexpected error occurred.");
  });

  it("preserves intentional validation messages", () => {
    expect(getErrorMessage(new Error("Missing required field: email"))).toBe(
      "Missing required field: email",
    );
  });
});
