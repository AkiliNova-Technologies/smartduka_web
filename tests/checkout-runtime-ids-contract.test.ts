import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/(customer)/checkout/page.tsx"), "utf8");

describe("checkout runtime idempotency IDs", () => {
  it("does not generate UUIDs during ref initialization", () => {
    expect(source).toContain("useRef<string | null>(null)");
    expect(source).not.toContain("useRef(crypto.randomUUID())");
  });

  it("creates a stable checkout ID after mount", () => {
    expect(source).toContain("checkoutRequestId.current ??= crypto.randomUUID()");
    expect(source).toContain("setCheckoutIdsReady(true)");
    expect(source).not.toContain("paymentInitiationRequestId");
  });

  it("gates submission until the checkout ID is available", () => {
    expect(source).toContain("if (!checkoutIdsReady || !checkoutId) return");
    expect(source).toContain("!checkoutIdsReady");
    expect(source).toContain("checkoutRequestId: checkoutId");
    expect(source).not.toContain("initiationRequestId:");
  });
});
