import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/(customer)/checkout/page.tsx"), "utf8");

describe("checkout runtime idempotency IDs", () => {
  it("does not generate UUIDs during ref initialization", () => {
    expect(source).toContain("useRef<string | null>(null)");
    expect(source).not.toContain("useRef(crypto.randomUUID())");
  });

  it("creates stable checkout and payment IDs after mount", () => {
    expect(source).toContain("checkoutRequestId.current ??= crypto.randomUUID()");
    expect(source).toContain("paymentInitiationRequestId.current ??= crypto.randomUUID()");
    expect(source).toContain("setCheckoutIdsReady(true)");
  });

  it("gates submission until both runtime IDs are available", () => {
    expect(source).toContain("if (!checkoutIdsReady || !checkoutId || !paymentInitiationId) return");
    expect(source).toContain("!checkoutIdsReady");
    expect(source).toContain("checkoutRequestId: checkoutId");
    expect(source).toContain("initiationRequestId: paymentInitiationId");
  });
});
