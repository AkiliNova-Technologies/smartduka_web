import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/(customer)/checkout/page.tsx"), "utf8");

describe("checkout payment method", () => {
  it("renders Pesapal as the selected, accessible payment option", () => {
    expect(source).toContain('role="radiogroup"');
    expect(source).toContain('type="radio"');
    expect(source).toContain('name="payment-method"');
    expect(source).toContain('checked={selectedPaymentGateway === "PESAPAL"}');
  });

  it("keeps the complete payment option clickable and compact", () => {
    expect(source).toContain("<label");
    expect(source).toContain('src="/payment-logos/pesapal.svg"');
    expect(source).toContain('width={44}');
    expect(source).toContain('disabled={isSubmitting}');
  });

  it("separates the redirect helper text from the payment option", () => {
    expect(source).toContain("Pay securely with card, Mobile Money, or other available methods.");
    expect(source).toContain("You’ll continue to Pesapal to complete payment securely.");
  });
});
