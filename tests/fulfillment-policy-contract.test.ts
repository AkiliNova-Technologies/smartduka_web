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

  it("allows delivery, pickup, or both through independent controls", () => {
    const form = source("src/components/vendor/settings/fulfillment-policy-tab.tsx");
    const action = source("src/actions/vendor-settings.ts");
    expect(form).toContain("<Checkbox");
    expect(form).toContain("Customer pickup");
    expect(form).toContain("Select delivery, customer pickup, or both.");
    expect(action).toContain('.min(1, "Choose at least one fulfilment method.")');
    expect(action).toContain('methods.includes("PICKUP")');
  });

  it("exposes persisted fulfilment snapshots to vendor and mobile order clients", () => {
    const vendorOrders = source("src/services/vendor-orders.ts");
    const customerOrders = source("src/services/order.ts");
    expect(vendorOrders).toContain("fulfillmentMethod");
    expect(vendorOrders).toContain("pickupInstructions");
    expect(customerOrders).toContain("fulfillmentSnapshot: true");
    expect(source("src/app/api/v1/orders/route.ts")).toContain("OrderService.getUserOrders");
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
    const storefront = source("src/services/vendor.ts");
    expect(order).toContain("exchangePolicy: group.items[0].exchangePolicy ?? null");
    expect(storefront).toContain("exchangePolicy: true");
  });
});
