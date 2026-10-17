"use client";

export interface NotificationDto {
  id: string;
  source: "PERSONAL" | "ANNOUNCEMENT" | "MARKETING";
  category: string;
  eventType: string | null;
  type: string;
  title: string;
  message: string;
  actionPath: string | null;
  readAt: string | null;
  createdAt: string;
}

interface PaginatedNotifications {
  data: Array<Omit<NotificationDto, "message"> & { body: string }>;
  meta: { page: number; pageSize: number; total: number; hasMore: boolean };
  unreadCount: number;
}

async function notificationRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null) as (T & { error?: { message?: string } }) | null;
  if (!response.ok) throw new Error(body?.error?.message || `Notification request failed (${response.status}).`);
  return body as T;
}

export const NotificationClient = {
  async list(signal?: AbortSignal, options: { page?: number; pageSize?: number; status?: "read" | "unread"; category?: string } = {}): Promise<{ items: NotificationDto[]; unreadCount: number; meta: PaginatedNotifications["meta"] }> {
    const query = new URLSearchParams({ page: String(options.page ?? 1), pageSize: String(options.pageSize ?? 50) });
    if (options.status) query.set("status", options.status);
    if (options.category) query.set("category", options.category);
    const response = await notificationRequest<PaginatedNotifications>(
      `/api/v1/notifications?${query}`,
      { signal },
    );
    return { items: response.data.map(({ body, ...item }) => ({ ...item, message: body })), unreadCount: response.unreadCount, meta: response.meta };
  },

  markRead(id: string) {
    return notificationRequest<{ data: { id: string; read: boolean } }>(
      `/api/v1/notifications/${encodeURIComponent(id)}/read`,
      { method: "PATCH" },
    );
  },

  markAllRead() {
    return notificationRequest<{ data: { updated: number } }>(
      "/api/v1/notifications/read-all",
      { method: "POST" },
    );
  },

  markUnread(id: string) {
    return notificationRequest<{ data: { id: string; read: false } }>(
      `/api/v1/notifications/${encodeURIComponent(id)}/unread`,
      { method: "PATCH" },
    );
  },

  delete(id: string) {
    return notificationRequest<{ data: { id: string; deleted: true } }>(
      `/api/v1/notifications/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  },
};
