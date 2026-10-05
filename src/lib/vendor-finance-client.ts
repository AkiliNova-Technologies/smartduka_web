import { authHeaders, fetchApi } from "@/lib/providers/useProviderFetch";

export type VendorFinanceSummary = {
  currency: string;
  balances: { pending: string; available: string; reserved: string; paidOut: string };
  hasAvailableBalance: boolean;
  destinations: Array<{ id: string; label: string; maskedDestination: string }>;
  disbursementsEnabled: boolean;
};

export type VendorWithdrawal = { id: string; amount: string | number; currency: string | null; status: string; maskedDestination: string | null; createdAt: string; updatedAt: string };

export const vendorFinanceClient = {
  getSummary: () => fetchApi<VendorFinanceSummary>("/api/vendor/finance/summary", { headers: authHeaders() }),
  getWithdrawals: () => fetchApi<{ withdrawals: VendorWithdrawal[] }>("/api/vendor/withdrawals", { headers: authHeaders() }),
  requestWithdrawal: (input: { amount: string; currency: string; destinationId: string; withdrawalRequestId: string }) => fetchApi("/api/vendor/withdrawals", { method: "POST", headers: authHeaders(), body: JSON.stringify(input) }),
};
