import { Decimal } from "@prisma/client/runtime/client";
import { describe, expect, it } from "vitest";
import { toVendorProfileDto } from "@/lib/vendor-profile-dto";
import { vendorDeliveryFeeSchema } from "@/lib/vendor-delivery-fee";

const containsDecimal = (value: unknown): boolean => {
  if (value instanceof Decimal) return true;
  if (Array.isArray(value)) return value.some(containsDecimal);
  return Boolean(value && typeof value === "object" && Object.values(value).some(containsDecimal));
};

describe("vendor profile client serialization", () => {
  it("converts Prisma Decimal delivery fees to precision-preserving strings", () => {
    const profile = toVendorProfileDto({ id: "vendor-1", deliveryFee: new Decimal("3500.25") });
    expect(profile).toEqual({ id: "vendor-1", deliveryFee: "3500.25" });
    expect(containsDecimal(profile)).toBe(false);
  });

  it("preserves a null delivery fee", () => {
    expect(toVendorProfileDto({ id: "vendor-1", deliveryFee: null }).deliveryFee).toBeNull();
  });

  it("does not coerce high-precision values through JavaScript numbers", () => {
    const profile = toVendorProfileDto({ deliveryFee: new Decimal("9007199254740991.25") });
    expect(profile.deliveryFee).toBe("9007199254740991.25");
  });

  it("validates update values without losing their decimal representation", () => {
    expect(vendorDeliveryFeeSchema.parse("3500.25")).toBe("3500.25");
    expect(vendorDeliveryFeeSchema.parse(3500)).toBe("3500");
    expect(vendorDeliveryFeeSchema.safeParse("3500.251").success).toBe(false);
    expect(vendorDeliveryFeeSchema.safeParse("-1").success).toBe(false);
  });
});
