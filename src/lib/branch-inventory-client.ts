import { authHeaders } from "@/lib/providers/useProviderFetch";

export type BranchInventoryData = {
  mode: "STANDARD" | "LOCATION_MANAGED";
  branches: Array<{ id: string; name: string; isActive: boolean }>;
  products: Array<{ id: string; name: string; sku: string | null; inventoryCount: number; variants: Array<{ id: string; name: string; sku: string | null; inventoryCount: number; isActive: boolean }> }>;
  inventories: Array<{ id: string; branchId: string; productId: string; variantId: string | null; onHandQuantity: number; reservedQuantity: number; branch: { name: string }; product: { name: string }; variant: { name: string; sku: string | null } | null; movements: Array<{ id: string; movementType: string; quantity: number; reason: string | null; createdAt: string }> }>;
};

export async function enableLocationInventory() {
  const response = await fetch("/api/v1/vendor/branch-inventory", { method: "PATCH", headers: authHeaders() });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "Unable to enable location-specific inventory.");
  return body.data;
}

export async function adjustStandardInventory(input: { productId: string; variantId?: string | null; operation: "INCREMENT" | "DECREMENT" | "SET"; quantity: number; reason: "RESTOCK" | "CORRECTION" | "DAMAGE" | "RETURN" | "OTHER" }) {
  const response = await fetch("/api/v1/vendor/inventory/adjustments", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ ...input, variantId: input.variantId ?? undefined }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "Unable to update inventory.");
  return body.data;
}

export async function loadBranchInventory(signal?: AbortSignal): Promise<BranchInventoryData> {
  const response = await fetch("/api/v1/vendor/branch-inventory", { headers: authHeaders(), signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "Unable to load branch inventory.");
  return body.data;
}

export async function mutateBranchInventory(input: { requestId: string; branchId: string; productId: string; variantId?: string | null; operation: "ALLOCATE" | "RESTOCK" | "ADJUST"; quantity: number; reason?: string }) {
  const response = await fetch("/api/v1/vendor/branch-inventory", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(input) });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "Unable to update inventory.");
  return body.data;
}
