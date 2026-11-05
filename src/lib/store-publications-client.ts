export type StorePublicationKind = "ANNOUNCEMENT" | "FOLLOWER_CAMPAIGN";
export type StorePublicationStatus = "DRAFT" | "IN_REVIEW" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED" | "EXPIRED";
export type StorePublication = { id: string; kind: StorePublicationKind; notificationTopic: "ANNOUNCEMENT" | "CAMPAIGN" | "NEW_ARRIVALS"; status: StorePublicationStatus; title: string; body: string; imageUrl: string | null; destination: "STOREFRONT" | "PRODUCT"; destinationProductId: string | null; scheduledAt: string | null; publishedAt: string | null; expiresAt: string | null; createdAt: string; products: { product: { id: string; name: string; slug: string } }[] };
export type AudienceMetrics = { totalFollowers: number; newFollowers7Days: number; newFollowers30Days: number; publishedAnnouncements: number; activeCampaigns: number; growth: { date: string; followers: number; added: number }[]; engagement: null; notifications: { processingEnabled: boolean; pushEnabled: boolean } };
export type StorePublicationDraft = { kind: StorePublicationKind; notificationTopic?: "ANNOUNCEMENT" | "CAMPAIGN" | "NEW_ARRIVALS"; title: string; body: string; imageUrl?: string | null; destination?: "STOREFRONT" | "PRODUCT"; destinationProductId?: string | null; productIds?: string[]; scheduledAt?: string | null; expiresAt?: string | null };
export type StorePublicationProduct = { id: string; name: string; slug: string; status: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> { const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers }, cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to complete this request."); return payload.data as T; }
export const StorePublicationsClient = {
  metrics: (signal?: AbortSignal) => request<AudienceMetrics>("/api/v1/vendor/audience", { signal }),
  list: (signal?: AbortSignal) => request<StorePublication[]>("/api/v1/vendor/publications?pageSize=50", { signal }),
  create: (draft: StorePublicationDraft) => request<StorePublication>("/api/v1/vendor/publications", { method: "POST", body: JSON.stringify(draft) }),
  update: (id: string, draft: StorePublicationDraft) => request<StorePublication>(`/api/v1/vendor/publications/${id}`, { method: "PATCH", body: JSON.stringify(draft) }),
  submit: (id: string) => request<StorePublication>(`/api/v1/vendor/publications/${id}/submit`, { method: "POST" }),
  publish: (id: string) => request<StorePublication>(`/api/v1/vendor/publications/${id}/publish`, { method: "POST" }),
  archive: (id: string) => request<StorePublication>(`/api/v1/vendor/publications/${id}/archive`, { method: "POST" }),
  products: (query: string, signal?: AbortSignal) => request<StorePublicationProduct[]>(`/api/v1/vendor/products?q=${encodeURIComponent(query)}&page=1&pageSize=20`, { signal }),
};
