import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({ list: vi.fn(), diagnostics: vi.fn() }));
vi.mock("@/services/admin-payment-operations", () => ({ AdminPaymentOperationsService: service }));

import { GET } from "@/app/api/admin/payments/route";

const row = { id: "intent-1", status: "PENDING" };
beforeEach(() => {
  vi.clearAllMocks();
  service.diagnostics.mockResolvedValue({ pending: 1, confirmationDelayed: 0, stuck: 0, reversed: 0, needsReview: 0 });
});

describe("admin payments queue contract", () => {
  it.each([[[]], [[row]], [[row, { ...row, id: "intent-2" }]]])("returns page-safe rows for %s", async (items) => {
    service.list.mockResolvedValue({ items, page: 1, pageSize: 25, total: items.length });
    const response = await GET(new Request("http://localhost/api/admin/payments?filter=ALL&page=1&pageSize=25"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(body.data.rows)).toBe(true);
    expect(body.data.rows).toEqual(items);
    expect(body.data.counts).toEqual(expect.objectContaining({ pending: 1, needsReview: 0 }));
    expect(body.data.pagination).toEqual({ page: 1, pageSize: 25, total: items.length, totalPages: Math.ceil(items.length / 25) });
  });
});
