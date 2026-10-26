import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/app/(vendor)/vendor/orders/vendor-orders-client.tsx",
  "utf8",
);

describe("vendor order delivery confirmation", () => {
  it("uses the platform alert dialog instead of a browser-native confirmation", () => {
    expect(source).not.toContain("window.confirm");
    expect(source).toContain("<AlertDialog");
    expect(source).toContain("Mark order as delivered?");
    expect(source).toContain("Confirm order collection?");
  });

  it("keeps the dialog open and disables dismissal while the update runs", () => {
    expect(source).toContain("event.preventDefault()");
    expect(source).toContain("if (!open && !updating) setPendingDelivery(null)");
    expect(source).toContain("<AlertDialogCancel disabled={Boolean(updating)}>");
  });
});
