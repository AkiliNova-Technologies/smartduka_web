import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  FULFILLMENT_METHODS,
  FulfillmentMethodSchema,
  isFulfillmentMethod,
} from "@/lib/fulfillment";

const source = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("fulfilment and exchange-policy contract", () => {
  it("uses the shared application fulfilment values", () => {
    expect(FULFILLMENT_METHODS).toEqual(["DELIVERY", "PICKUP"]);
    expect(FulfillmentMethodSchema.safeParse("DELIVERY").success).toBe(true);
    expect(FulfillmentMethodSchema.safeParse("PICKUP").success).toBe(true);
    expect(isFulfillmentMethod("DRONE")).toBe(false);
  });

  it("does not validate settings with Prisma enum runtime values", () => {
    const action = source("src/actions/vendor-settings.ts");
    expect(action).toContain("FulfillmentMethodSchema");
    expect(action).not.toContain("Object.values(FulfillmentMethod)");
  });

  it("shows and validates an exchange policy only when exchanges are enabled", () => {
    const form = source("src/components/vendor/settings/fulfillment-policy-tab.tsx");
    const action = source("src/actions/vendor-settings.ts");
    expect(form).toContain("{exchanges && (");
    expect(form).toContain('label="Exchange Policy"');
    expect(action).toContain("Add an exchange policy or disable exchanges.");
  });

  it("persists and projects exchange policy text for new order snapshots and storefronts", () => {
    const order = source("src/services/order.ts");
    const storefront = source("src/app/(customer)/shops/[vendorSlug]/page.tsx");
    expect(order).toContain("exchangePolicy: group.items[0].exchangePolicy ?? null");
    expect(storefront).toContain("exchangePolicy: vendorProfile.exchangePolicy");
  });
});
