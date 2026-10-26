import { describe, expect, it } from "vitest";
import { productRecoveryKey, readProductRecovery } from "@/hooks/use-product-form-recovery";

describe("product form recovery", () => {
  it("uses vendor and product scope in the storage key", () => {
    expect(productRecoveryKey("vendor-a", "new")).not.toBe(productRecoveryKey("vendor-b", "new"));
    expect(productRecoveryKey("vendor-a", "product-a")).not.toBe(productRecoveryKey("vendor-a", "product-b"));
  });

  it("rejects recovery data copied across accounts", () => {
    const value = JSON.stringify({ version: 1, vendorId: "vendor-a", scope: "new", savedAt: new Date().toISOString(), value: { title: "Shoes" } });
    const storage = { getItem: () => value };
    expect(readProductRecovery(storage, "vendor-b", "new")).toBeNull();
  });

  it("ignores malformed local data", () => {
    expect(readProductRecovery({ getItem: () => "not-json" }, "vendor-a", "new")).toBeNull();
  });
});
