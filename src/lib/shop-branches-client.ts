import { authHeaders } from "@/lib/providers/useProviderFetch";

export type ShopBranchDto = {
  id: string; name: string; slug: string; branchType: "STORE" | "WAREHOUSE" | "PICKUP_POINT"; isPrimary: boolean; isActive: boolean;
  pickupEnabled: boolean; deliveryEnabled: boolean; addressLine: string | null; city: string | null; district: string | null; country: string | null;
  contactPhone: string | null; openingHours: Record<string, string> | null; pickupInstructions: string | null; deliveryAreas: string[]; deliveryFee: string | number | null; deliveryEstimate: string | null;
};
export type ShopBranchInput = Omit<ShopBranchDto, "id" | "deliveryFee"> & { deliveryFee: number | null; latitude?: number | null; longitude?: number | null };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...authHeaders(), ...Object.fromEntries(new Headers(init?.headers).entries()) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message ?? "Unable to save this location.");
  return body.data as T;
}
export const shopBranchesClient = {
  list: () => request<ShopBranchDto[]>("/api/v1/vendor/branches"),
  create: (input: ShopBranchInput) => request<ShopBranchDto>("/api/v1/vendor/branches", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: ShopBranchInput) => request<ShopBranchDto>(`/api/v1/vendor/branches/${id}`, { method: "PUT", body: JSON.stringify(input) }),
};
