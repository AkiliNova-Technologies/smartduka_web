"use client";
export type FollowState = { following: boolean; followerCount: number };
export type FollowedStore = { id: string; storeName: string; slug: string; logoUrl: string | null; description: string | null; city: string | null; country: string | null; isVerified: boolean; followerCount: number; followedAt: string };
export type FollowingActivity = { id: string; type: "NEW_PRODUCT"; publishedAt: string; title: string; description: string; imageUrl: string | null; destinationPath: string; store: { id: string; storeName: string; slug: string; logoUrl: string | null } };
type Page<T> = { data: T[]; meta: { page: number; pageSize: number; total: number; hasMore: boolean } };
async function request<T>(path: string, init?: RequestInit): Promise<T> { const response = await fetch(path, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } }); const body = await response.json().catch(() => null) as (T & { error?: { message?: string } }) | null; if (!response.ok) throw new Error(body?.error?.message || "Unable to update store following."); return body as T; }
export const StoreFollowingClient = {
  state: async (vendorId: string, signal?: AbortSignal) => (await request<{ data: FollowState }>(`/api/v1/shops/${encodeURIComponent(vendorId)}/follow`, { signal })).data,
  set: async (vendorId: string, following: boolean) => (await request<{ data: FollowState }>(`/api/v1/shops/${encodeURIComponent(vendorId)}/follow`, { method: following ? "PUT" : "DELETE" })).data,
  list: (page = 1, signal?: AbortSignal) => request<Page<FollowedStore>>(`/api/v1/following?page=${page}&pageSize=20`, { signal }),
  activity: (page = 1, signal?: AbortSignal) => request<Page<FollowingActivity>>(`/api/v1/following/activity?page=${page}&pageSize=20`, { signal }),
};
