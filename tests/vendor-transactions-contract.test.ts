import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const file = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const service = file("src/services/vendor-transactions.ts");
const listRoute = file("src/app/api/v1/vendor/transactions/route.ts");
const detailRoute = file("src/app/api/v1/vendor/transactions/[id]/route.ts");
const page = file("src/app/(vendor)/vendor/transactions/page.tsx");
const client = file("src/app/(vendor)/vendor/transactions/vendor-transactions-client.tsx");
const sidebar = file("src/components/layout/VendorSidebar.tsx");

describe("vendor transactions contract", () => {
  it("keeps every read seller-scoped and gates endpoints through vendor membership", () => {
    expect(service).toContain("vendorId,");
    expect(service).toContain("where: { id, vendorId }");
    expect(listRoute).toContain('requireVendorContext("vendor:view_ledger")');
    expect(detailRoute).toContain('requireVendorContext("vendor:view_ledger")');
  });

  it("returns operational payment data only, with a masked provider reference", () => {
    expect(service).toContain("maskedProviderReference");
    expect(service).toContain("••••${value.slice(-4)}");
    expect(service).not.toContain("merchantPhoneEncrypted");
    expect(service).not.toContain("providerEvents");
  });

  it("uses the authenticated request boundary and a shared scan-first table", () => {
    expect(page).toContain("await connection()");
    expect(page).toContain('requireVendorContext("vendor:view_ledger")');
    expect(client).toContain("<DataTable");
    expect(client).toContain('placeholder: "Search transactions..."');
    expect(client).toContain("VendorTransactionDetailsSheet");
    expect(client).toContain("Payment reversed — review required");
  });

  it("replaces redundant Payments navigation with Transactions while retaining Store Settings", () => {
    expect(sidebar).toContain('{ label: "Transactions", href: "/vendor/transactions"');
    expect(sidebar).toContain('{ label: "Shop settings", href: "/vendor/settings"');
    expect(sidebar).not.toContain('label: "Payments", href: "/vendor/settings?tab=payments"');
  });
});
