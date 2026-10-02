import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("product detail reviews and fulfilment", () => {
  const detail = source("src/app/(customer)/products/[slug]/ProductDetailContent.tsx");
  const action = source("src/actions/product.ts");

  it("uses a contained review empty state and keeps eligible review entry concise", () => {
    expect(detail).toContain("No reviews yet");
    expect(detail).toContain("Be the first verified customer");
    expect(detail).toContain("empty-notifications.svg");
    expect(detail).toContain("showEligibilityMessage={false}");
  });

  it("renders published review evidence", () => {
    for (const token of ["Verified purchase", "Customer review photo", "Shop reply:", "Purchased:"]) {
      expect(detail).toContain(token);
    }
  });

  it("projects and conditionally renders public delivery, pickup, returns, and exchanges settings", () => {
    for (const token of ["fulfillmentMethods", "deliveryEstimate", "pickupLocation", "returnWindowDays", "returnInstructions", "acceptsExchanges"]) {
      expect(action).toContain(token);
      expect(detail).toContain(token);
    }
    expect(detail).toContain("Delivery available");
    expect(detail).toContain("Pickup available");
    expect(detail).toContain("Exchanges available");
    expect(detail).toContain("View delivery &amp; returns");
  });

  it("preserves related products through the shared ProductCard", () => {
    expect(detail).toContain('<ProductCard key={item.id} product={item} />');
  });
});
