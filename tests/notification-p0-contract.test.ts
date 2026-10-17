import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationClient } from "@/lib/notification-client";
import { NotificationService, safeNotificationPath } from "@/services/notifications";

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

describe("P0 notification client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the authenticated bounded v1 endpoint and maps its transport body", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({
      data: [{ id: "n-1", type: "INFO", title: "Hello", body: "World", actionPath: "/orders/1", readAt: null, createdAt: "2026-10-16T00:00:00.000Z" }],
      meta: { page: 1, pageSize: 50, total: 1, hasMore: false },
      unreadCount: 1,
    }));
    vi.stubGlobal("fetch", fetch);
    await expect(NotificationClient.list()).resolves.toMatchObject({ items: [{ id: "n-1", message: "World" }], unreadCount: 1 });
    expect(fetch).toHaveBeenCalledWith("/api/v1/notifications?page=1&pageSize=50", expect.objectContaining({ cache: "no-store" }));
  });

  it("persists single and bulk read mutations and exposes API failures", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { id: "n-1", read: true } }))
      .mockResolvedValueOnce(jsonResponse({ data: { updated: 3 } }))
      .mockResolvedValueOnce(jsonResponse({ error: { message: "Session expired" } }, 401));
    vi.stubGlobal("fetch", fetch);
    await NotificationClient.markRead("n-1");
    await NotificationClient.markAllRead();
    await expect(NotificationClient.markRead("n-2")).rejects.toThrow("Session expired");
    expect(fetch.mock.calls[0][0]).toBe("/api/v1/notifications/n-1/read");
    expect(fetch.mock.calls[1][0]).toBe("/api/v1/notifications/read-all");
  });

  it("uses recipient-scoped endpoints for unread and deletion mutations", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { id: "n-1", read: false } }))
      .mockResolvedValueOnce(jsonResponse({ data: { id: "n-1", deleted: true } }));
    vi.stubGlobal("fetch", fetch);
    await NotificationClient.markUnread("n-1");
    await NotificationClient.delete("n-1");
    expect(fetch.mock.calls[0]).toEqual(expect.arrayContaining([
      "/api/v1/notifications/n-1/unread",
      expect.objectContaining({ method: "PATCH" }),
    ]));
    expect(fetch.mock.calls[1]).toEqual(expect.arrayContaining([
      "/api/v1/notifications/n-1",
      expect.objectContaining({ method: "DELETE" }),
    ]));
  });
});

describe("P0 notification server contract", () => {
  it("accepts only safe internal destinations", () => {
    expect(safeNotificationPath("/orders/order-1")).toBe("/orders/order-1");
    expect(safeNotificationPath("https://example.com/steal")).toBeNull();
    expect(safeNotificationPath("//example.com/steal")).toBeNull();
    expect(safeNotificationPath("javascript:alert(1)")).toBeNull();
  });

  it("resolves only active vendor members with order access and always includes the owner", async () => {
    const db = { user: { findMany: vi.fn().mockResolvedValue([
      { id: "manager-1", vendorRole: "MANAGER" },
      { id: "staff-1", vendorRole: "STAFF" },
    ]) } };
    await expect(NotificationService.vendorOrderRecipients("vendor-1", "owner-1", db)).resolves.toEqual(["owner-1", "manager-1", "staff-1"]);
    expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ vendorId: "vendor-1", status: "ACTIVE" }) }));
  });

  it("keeps notification state tied to synchronized identity and aborts stale requests", () => {
    const provider = readFileSync(join(process.cwd(), "src/providers/UserDataProvider.tsx"), "utf8");
    expect(provider).toContain("sessionReady");
    expect(provider).toContain("notificationAbortRef.current?.abort()");
    expect(provider).toContain("notificationIdentityRef.current = uid");
    expect(provider).toContain("setNotifications([])");
    expect(provider).toContain("NotificationClient.markAllRead()");
  });

  it("keeps notification APIs server-authorized by active user identity", () => {
    const listRoute = readFileSync(join(process.cwd(), "src/app/api/v1/notifications/route.ts"), "utf8");
    const readRoute = readFileSync(join(process.cwd(), "src/app/api/v1/notifications/[id]/read/route.ts"), "utf8");
    expect(listRoute).toContain("requireActiveUserId()");
    expect(listRoute).toContain("const personalWhere = { userId, deletedAt: null");
    expect(readRoute).toContain("where: { id, userId, deletedAt: null }");
  });
});
