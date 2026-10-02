import { Decimal } from "@prisma/client/runtime/client";
import { describe, expect, it } from "vitest";
import {
  serializeMarketplaceProduct,
  serializePublicProductDetail,
} from "@/services/product";

const containsDecimal = (value: unknown): boolean => {
  if (value instanceof Decimal) return true;
  if (Array.isArray(value)) return value.some(containsDecimal);
  return Boolean(value && typeof value === "object" && Object.values(value).some(containsDecimal));
};

describe("public product serializers", () => {
  const record = {
    id: "product-1", name: "Decimal-safe shirt", slug: "decimal-safe-shirt", brand: "SmartDuka", description: "A shirt",
    basePrice: new Decimal("12000.50"), compareAtPrice: new Decimal("15000"), inventoryCount: 7, sku: "SHIRT-1", status: "PUBLISHED",
    sizes: ["M"], colors: ["Blue"], specs: [{ name: "Fabric", value: "Cotton" }], tags: ["new"], createdAt: new Date("2026-01-01T00:00:00.000Z"),
    images: [{ id: "image-1", url: "https://example.com/shirt.jpg", isFeatured: true }],
    category: { id: "fashion", name: "Fashion", slug: "fashion" }, subCategory: null,
    vendorId: "shop-1", vendor: { id: "shop-1", storeName: "Shop", slug: "shop", logoUrl: null, isVerified: true, fulfillmentMethods: ["DELIVERY"] as const, deliveryFee: new Decimal("3500"), deliveryEstimate: "Today", pickupLocation: null, returnWindowDays: 7, returnPolicy: null, returnInstructions: null, acceptsExchanges: false, exchangePolicy: null },
    variants: [{ id: "variant-1", sku: "SHIRT-1-M", name: "Medium", price: new Decimal("12500.25"), inventoryCount: 4, options: { Size: "M" }, isActive: true }],
    reviews: [{ id: "review-1", rating: 5, comment: "Great", verifiedPurchase: true, createdAt: new Date("2026-01-02T00:00:00.000Z"), title: null, imageUrls: [], user: { name: "Ada", avatarUrl: null }, variant: { name: "Medium" }, vendorReplies: [] }],
    _count: { reviews: 1 },
  };

  it("converts catalogue and nested variant Decimal prices to numbers", () => {
    const result = serializeMarketplaceProduct(record);
    expect(result).toMatchObject({ basePrice: 12500.25, compareAtPrice: 15000, variants: [{ price: 12500.25 }] });
    expect(containsDecimal(result)).toBe(false);
  });

  it("creates a fully plain public detail DTO, including financial vendor fields", () => {
    const result = serializePublicProductDetail(record);
    expect(result).toMatchObject({ basePrice: 12000.5, compareAtPrice: 15000, vendor: { deliveryFee: 3500 }, variants: [{ price: 12500.25 }] });
    expect(containsDecimal(result)).toBe(false);
  });
});
