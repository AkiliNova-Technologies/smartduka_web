import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/components/vendor/settings/locations-fulfillment-tab.tsx",
  "utf8",
);

describe("Locations & fulfilment settings UI", () => {
  it("keeps the single-location experience optional", () => {
    expect(source).toContain("Your main shop is all you need");
    expect(source).toContain("Additional locations are optional");
    expect(source).toContain("standard Fulfilment &amp; Returns settings");
  });

  it("uses shared cards, DataTable, dialogs, switches, and semantic tokens", () => {
    expect(source).toContain("<Card>");
    expect(source).toContain("<DataTable");
    expect(source).toContain("<Dialog");
    expect(source).toContain("<Switch");
    expect(source).toContain('from "@/components/ui/card"');
    expect(source).toContain("border-border");
    expect(source).not.toMatch(/emerald-|zinc-|rose-/);
  });

  it("supports add and edit dialogs with scoped fulfilment controls", () => {
    expect(source).toContain('editing ? "Edit location" : "Add location"');
    expect(source).toContain('label="Store pickup"');
    expect(source).toContain('label="Delivery"');
    expect(source).toContain("An active location must offer pickup or delivery");
  });

  it("preserves deactivation guidance and explicit inventory enablement", () => {
    expect(source).toContain("Locations with active orders cannot be deactivated");
    expect(source).toContain("Enable location inventory?");
    expect(source).toContain("inventory.enableLocations()");
    expect(source).not.toContain("window.confirm");
  });

  it("prevents duplicate saves and preserves service errors in the dialog", () => {
    expect(source).toContain("if (saving || !validate()) return");
    expect(source).toContain('role="alert"');
    expect(source).toContain("disabled={saving}");
  });
});
