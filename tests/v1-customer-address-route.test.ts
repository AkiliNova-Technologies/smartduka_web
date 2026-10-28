import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireActiveUserId: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(),
  remove: vi.fn(), setDefault: vi.fn(),
}));
const errors = vi.hoisted(() => ({ AuthenticationRequiredError: class AuthenticationRequiredError extends Error {} }));
vi.mock("@/lib/auth/session", () => ({
  AuthenticationRequiredError: errors.AuthenticationRequiredError,
  AccountInactiveError: class AccountInactiveError extends Error {},
  requireActiveUserId: mocks.requireActiveUserId,
}));
vi.mock("@/services/customer-addresses", () => ({ CustomerAddressService: mocks }));

import * as collection from "@/app/api/v1/addresses/route";
import * as item from "@/app/api/v1/addresses/[addressId]/route";
import * as defaultRoute from "@/app/api/v1/addresses/[addressId]/default/route";

const valid = {
  label: "Home", recipientName: "Amina N.", recipientPhone: "+256 772 123456",
  country: "Uganda", district: "Kampala", city: "Kampala", area: "Ntinda",
  street: "Semawata Road", building: null, landmark: "Near Capital Shoppers",
  deliveryInstructions: "Call on arrival", isDefault: false,
};

describe("V1 customer address routes", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.requireActiveUserId.mockResolvedValue("customer-a");
    for (const method of [mocks.list, mocks.create, mocks.update, mocks.remove, mocks.setDefault]) method.mockResolvedValue({ id: "address-1" });
  });

  it("scopes every operation to the server-resolved customer", async () => {
    await collection.GET();
    await collection.POST(new Request("https://smartduka.test/api/v1/addresses", { method: "POST", headers: { "content-type": "application/json", "x-marketplace-user-id": "customer-b" }, body: JSON.stringify({ ...valid, customerId: "customer-b" }) }));
    await item.PATCH(new Request("https://smartduka.test", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ label: "Work" }) }), { params: Promise.resolve({ addressId: "address-1" }) });
    await item.DELETE(new Request("https://smartduka.test"), { params: Promise.resolve({ addressId: "address-1" }) });
    await defaultRoute.POST(new Request("https://smartduka.test"), { params: Promise.resolve({ addressId: "address-1" }) });
    expect(mocks.list).toHaveBeenCalledWith("customer-a");
    expect(mocks.create).not.toHaveBeenCalled(); // strict schema rejects injected customerId
    expect(mocks.update).toHaveBeenCalledWith("customer-a", "address-1", { label: "Work" });
    expect(mocks.remove).toHaveBeenCalledWith("customer-a", "address-1");
    expect(mocks.setDefault).toHaveBeenCalledWith("customer-a", "address-1");
  });

  it("creates valid Uganda addresses and rejects invalid fields", async () => {
    const created = await collection.POST(new Request("https://smartduka.test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(valid) }));
    expect(created.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith("customer-a", valid);
    const invalid = await collection.POST(new Request("https://smartduka.test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...valid, country: "Kenya", recipientPhone: "123" }) }));
    expect(invalid.status).toBe(400);
  });

  it("does not invoke services when authentication fails", async () => {
    mocks.requireActiveUserId.mockRejectedValue(new errors.AuthenticationRequiredError());
    const response = await collection.GET();
    expect(response.status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
