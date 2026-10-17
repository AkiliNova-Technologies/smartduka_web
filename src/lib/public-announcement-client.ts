export type BannerAnnouncement = { id: string; title: string; message: string; destination: string | null; priority: string; expiresAt: string | null };
async function request<T>(url: string, init?: RequestInit) { const response = await fetch(url, { ...init, cache: "no-store" }); const body = await response.json().catch(() => null) as { data?: T; error?: { message?: string } } | null; if (!response.ok || body?.data === undefined) throw new Error(body?.error?.message || "Announcement request failed."); return body.data; }
export const PublicAnnouncementClient = {
  banners: (signal?: AbortSignal) => request<BannerAnnouncement[]>("/api/v1/announcements/banners", { signal }),
  dismiss: (id: string) => request<{ dismissed: true }>(`/api/v1/announcements/${encodeURIComponent(id)}/dismiss`, { method: "POST" }),
};
