import type { TestDataCleanupPlan } from "@/services/test-data-cleanup";

export type CleanupOverview = {
  environment: "DEVELOPMENT" | "TEST" | "STAGING" | "PRODUCTION";
  productionEnabled: boolean;
  batches: Array<{ id: string; name: string; status: string; createdAt: string; verifiedAt: string | null; _count: { records: number } }>;
  accounts: Array<{ entityId: string; batchId: string; name: string; email: string }>;
  shops: Array<{ entityId: string; batchId: string; name: string; slug: string }>;
};
export type CleanupPreview = { planId: string; expiresAt: string; plan: TestDataCleanupPlan };

export class CleanupClientError extends Error {
  constructor(message: string, public readonly code?: string, public readonly status?: number) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => null) as { success?: boolean; data?: T; error?: string; code?: string } | null;
  if (!response.ok || !body?.success) throw new CleanupClientError(body?.error ?? "Test-data cleanup request failed.", body?.code, response.status);
  return body.data as T;
}

export const testDataCleanupClient = {
  overview: (signal?: AbortSignal) => request<CleanupOverview>("/api/admin/test-data-cleanup", { signal }),
  preview: (input: { scope: "ACCOUNT" | "SHOP" | "BATCH" | "ALL"; scopeId?: string | null }, signal?: AbortSignal) => request<CleanupPreview>("/api/admin/test-data-cleanup/preview", { method: "POST", body: JSON.stringify(input), signal }),
  execute: (input: { planId: string; confirmation: string }) => request<{ planId: string; deleted: Record<string, number>; deletedTotal: number; storageQueued: number; storageProtected: number; identityDeletionsQueued: number }>("/api/admin/test-data-cleanup/execute", { method: "POST", body: JSON.stringify(input) }),
};
