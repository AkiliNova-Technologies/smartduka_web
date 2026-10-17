"use client";

import type { UserOrder } from "@/providers/UserDataProvider";

export class OrderRequestError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) { super(message); }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, cache: "no-store", headers: { Accept: "application/json" } });
  const body = await response.json().catch(() => null) as { data?: T; error?: { code?: string; message?: string } } | null;
  if (!response.ok) throw new OrderRequestError(body?.error?.message || "Unable to load orders.", response.status, body?.error?.code);
  return body?.data as T;
}

export interface OrderPage {
  data: UserOrder[];
  meta: { page: number; pageSize: number; total: number; pageCount: number; hasMore: boolean };
}

export const OrderClient = {
  async list(page: number, filter: string, signal?: AbortSignal): Promise<OrderPage> {
    const query = new URLSearchParams({ page: String(page) });
    if (filter !== "all") query.set("filter", filter);
    const response = await fetch(`/api/v1/orders?${query}`, { signal, cache: "no-store", headers: { Accept: "application/json" } });
    const body = await response.json().catch(() => null) as (OrderPage & { error?: { code?: string; message?: string } }) | null;
    if (!response.ok) throw new OrderRequestError(body?.error?.message || "Unable to load orders.", response.status, body?.error?.code);
    return body as OrderPage;
  },
  get(id: string, signal?: AbortSignal) { return request<UserOrder>(`/api/v1/orders/${encodeURIComponent(id)}`, signal); },
};
