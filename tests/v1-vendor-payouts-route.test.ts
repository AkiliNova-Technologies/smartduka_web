import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), add: vi.fn() }));
vi.mock("@/services/vendor-payout", () => ({ VendorPayoutService: { getPayoutAccounts: mocks.list, addPayoutAccount: mocks.add } }));

import { GET, POST } from "@/app/api/v1/vendor/payouts/route";

beforeEach(() => { vi.clearAllMocks(); mocks.list.mockResolvedValue([{ id: "account-a", provider: "MTN_MOBILE_MONEY", maskedReference: "+256 77••• ••42", status: "ACTIVE", isDefault: true }]); });

describe("v1 vendor payouts", () => {
  it("returns only masked payout DTOs", async () => {
    const response = await GET();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ data: [{ id: "account-a", provider: "MTN_MOBILE_MONEY", maskedReference: "+256 77••• ••42", status: "ACTIVE", isDefault: true }] });
  });

  it("validates input before calling the canonical service", async () => {
    const response = await POST(new Request("http://localhost/api/v1/vendor/payouts", { method: "POST", body: JSON.stringify({ provider: "CARD", accountHolderName: "Albert", mobileNumber: "0777000042" }) }));
    expect(response.status).toBe(400);
    expect(mocks.add).not.toHaveBeenCalled();
  });
});
