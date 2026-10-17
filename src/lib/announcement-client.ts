export type AnnouncementRecord = {
  id: string; title: string; message: string; category: "GENERAL" | "OPERATIONS" | "SECURITY" | "POLICY" | "PRODUCT";
  priority: "NORMAL" | "IMPORTANT" | "CRITICAL"; audience: "ALL" | "CUSTOMERS" | "VENDORS" | "ADMINISTRATORS";
  presentation: "NOTIFICATION" | "BANNER"; destination: string | null; status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "CANCELLED" | "EXPIRED";
  scheduledAt: string | null; publishedAt: string | null; expiresAt: string | null; createdAt: string; updatedAt: string;
  createdBy: { id: string; name: string }; publishedBy: { id: string; name: string } | null;
};

export type AnnouncementDraft = Pick<AnnouncementRecord, "title" | "message" | "category" | "priority" | "audience" | "presentation" | "destination" | "scheduledAt" | "expiresAt">;
type Envelope<T> = { success?: boolean; data?: T; error?: string };
async function request<T>(url: string, init?: RequestInit) { const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } }); const body = await response.json().catch(() => ({})) as Envelope<T>; if (!response.ok || !body.success || body.data === undefined) throw new Error(body.error || "Unable to manage announcement."); return body.data; }
export const AnnouncementClient = {
  list: (signal?: AbortSignal) => request<{ announcements: AnnouncementRecord[] }>("/api/admin/notifications", { signal }),
  create: (draft: AnnouncementDraft) => request<AnnouncementRecord>("/api/admin/notifications", { method: "POST", body: JSON.stringify(draft) }),
  update: (id: string, draft: AnnouncementDraft) => request<AnnouncementRecord>(`/api/admin/notifications/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(draft) }),
  publish: (id: string) => request<AnnouncementRecord>(`/api/admin/notifications/${encodeURIComponent(id)}/publish`, { method: "POST" }),
  cancel: (id: string) => request<AnnouncementRecord>(`/api/admin/notifications/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
};
