import { Decimal } from "@prisma/client/runtime/client";
import { describe, expect, it } from "vitest";
import { serializePublicShopListing } from "@/lib/public-shop-dto";

const containsDecimal = (value: unknown): boolean => {
  if (value instanceof Decimal) return true;
  if (Array.isArray(value)) return value.some(containsDecimal);
  return Boolean(value && typeof value === "object" && Object.values(value).some(containsDecimal));
};

describe("public shop listing serializer", () => {
  it("returns a plain public card DTO without payout configuration", () => {
    const shop = serializePublicShopListing({
      id: "shop-1", storeName: "Wati Fashions", slug: "wati-fashions",
      logoUrl: null, bannerUrl: null, description: "Tailored looks", city: "Kampala",
      country: "Uganda", isVerified: true, fulfillmentMethods: ["DELIVERY", "PICKUP"],
      deliveryFee: new Decimal("3500.00"), deliveryEstimate: "Today", _count: { products: 3 },
    });

    expect(shop).toMatchObject({ deliveryFee: 3500, productCount: 3, fulfillmentMethods: ["DELIVERY", "PICKUP"] });
    expect(containsDecimal(shop)).toBe(false);
    expect(shop).not.toHaveProperty("bankAccountNumber");
    expect(shop).not.toHaveProperty("bankAccountName");
    expect(shop).not.toHaveProperty("bankName");
    expect(shop).not.toHaveProperty("momoMerchantCode");
  });
});
