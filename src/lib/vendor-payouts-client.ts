export type VendorPayoutAccount = {
  id: string;
  provider: "MTN_MOBILE_MONEY" | "AIRTEL_MONEY";
  accountHolderName: string;
  maskedReference: string;
  status: "PENDING" | "ACTIVE" | "DISABLED";
  isDefault: boolean;
  createdAt: string;
};

type PayoutInput = { provider: VendorPayoutAccount["provider"]; accountHolderName: string; mobileNumber: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Unable to update payout details.");
  return payload.data as T;
}

export const vendorPayoutsClient = {
  getAccounts: async () => (await request<{ accounts: VendorPayoutAccount[] }>("/api/vendor/payouts")).accounts,
  createAccount: (input: PayoutInput) => request<VendorPayoutAccount>("/api/vendor/payouts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }),
  setDefault: (id: string) => request<VendorPayoutAccount>(`/api/vendor/payouts/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "set-default" }) }),
  disable: (id: string) => request<VendorPayoutAccount>(`/api/vendor/payouts/${id}`, { method: "DELETE" }),
};
