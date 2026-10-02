import { describe, expect, it } from "vitest";
import { PRODUCT_IMAGE_FALLBACK, SHOP_BANNER_FALLBACK, SHOP_LOGO_FALLBACK, mediaSource } from "@/lib/media";

describe("canonical media fallback selection", () => {
  it("uses a real URL when it is present", () => {
    expect(mediaSource("https://cdn.example.test/product.jpg", PRODUCT_IMAGE_FALLBACK)).toBe("https://cdn.example.test/product.jpg");
  });

  it("uses the matching local fallback for missing or blank media", () => {
    expect(mediaSource(undefined, PRODUCT_IMAGE_FALLBACK)).toBe(PRODUCT_IMAGE_FALLBACK);
    expect(mediaSource("  ", SHOP_LOGO_FALLBACK)).toBe(SHOP_LOGO_FALLBACK);
    expect(mediaSource(null, SHOP_BANNER_FALLBACK)).toBe(SHOP_BANNER_FALLBACK);
  });
});
