import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getInventoryProductQuantity } from "@/app/(vendor)/vendor/inventory/inventory-client";
import { calculateInventoryProjection } from "@/components/vendor/inventory-update-dialog";

const inventorySource = readFileSync(
  "src/app/(vendor)/vendor/inventory/inventory-client.tsx",
  "utf8",
);
const dialogSource = readFileSync(
  "src/components/vendor/inventory-update-dialog.tsx",
  "utf8",
);

describe("vendor inventory DataTable", () => {
  it("uses one centralized DataTable row per product", () => {
    expect(inventorySource).toContain("<DataTable");
    expect(inventorySource).toContain("data={visibleProducts}");
    expect(inventorySource).toContain("getRowId={(product) => product.id}");
  });

  it("aggregates variant stock without double-counting parent inventory", () => {
    expect(
      getInventoryProductQuantity({
        id: "product-1",
        name: "Dress",
        sku: "DRESS",
        inventoryCount: 999,
        variants: [
          { id: "small", name: "Small", sku: "DRESS-S", inventoryCount: 2, isActive: true },
          { id: "large", name: "Large", sku: "DRESS-L", inventoryCount: 3, isActive: true },
        ],
      }),
    ).toBe(5);
  });

  it("uses simple-product stock when there are no variants", () => {
    expect(
      getInventoryProductQuantity({
        id: "product-2",
        name: "Bag",
        sku: "BAG",
        inventoryCount: 7,
        variants: [],
      }),
    ).toBe(7);
  });

  it("keeps variant identities and expansion in the shared table", () => {
    expect(inventorySource).toContain("renderSubRow={(product)");
    expect(inventorySource).toContain("beginUpdate(product.id, variant.id)");
    expect(inventorySource).toContain("variant.sku");
  });

  it("isolates location controls to location-managed mode", () => {
    expect(inventorySource).toContain("{managed && (");
    expect(inventorySource).toContain('aria-label="Location filter"');
    expect(dialogSource).toContain('id="inventory-dialog-location"');
  });

  it("calculates restocks and absolute corrections", () => {
    expect(calculateInventoryProjection(4, "RESTOCK", 5)).toEqual({ current: 4, change: 5, next: 9 });
    expect(calculateInventoryProjection(4, "CORRECTION", 2)).toEqual({ current: 4, change: -2, next: 2 });
  });

  it("uses the shared dialog and a dedicated reduction confirmation step", () => {
    expect(dialogSource).toContain("<Dialog open={open}");
    expect(dialogSource).toContain("Confirm stock reduction");
    expect(dialogSource).not.toContain("window.confirm");
    expect(dialogSource).toContain('operation: operation === "RESTOCK" ? "INCREMENT" : "SET"');
    expect(dialogSource).toContain('quantity: operation === "RESTOCK" ? amount : projection.change');
  });
});
