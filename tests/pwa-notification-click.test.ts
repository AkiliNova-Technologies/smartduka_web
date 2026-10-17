import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

type WindowClient = { url: string; navigate?: ReturnType<typeof vi.fn>; focus?: ReturnType<typeof vi.fn> };
type NotificationClickEvent = {
  notification: { data: { path: unknown }; close: ReturnType<typeof vi.fn> };
  waitUntil: (promise: Promise<unknown>) => void;
};
type WorkerEventHandler = (event: NotificationClickEvent) => void;

function notificationWorker(windows: WindowClient[], openWindow = vi.fn()) {
  const listeners = new Map<string, WorkerEventHandler>();
  const worker = {
    location: { origin: "https://mwezora.test" },
    registration: { scope: "https://mwezora.test/" },
    clients: { matchAll: vi.fn(async () => windows), openWindow },
    addEventListener: (type: string, handler: WorkerEventHandler) => listeners.set(type, handler),
  };
  vm.runInNewContext(fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8"), { self: worker, URL, caches: {} });
  return {
    worker,
    async click(pathname: unknown) {
      const close = vi.fn();
      let pending: Promise<unknown> | undefined;
      listeners.get("notificationclick")!({ notification: { data: { path: pathname }, close }, waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
      await pending;
      expect(close).toHaveBeenCalledOnce();
    },
  };
}

describe("PWA notification click navigation", () => {
  it.each(["/", "/products"]) ("navigates and focuses an existing Mwezora tab from %s", async (pathname) => {
    const navigated = { url: "https://mwezora.test/notifications", focus: vi.fn(async () => undefined) };
    const client = { url: `https://mwezora.test${pathname}`, navigate: vi.fn(async () => navigated), focus: vi.fn() };
    const harness = notificationWorker([client]);
    await harness.click("/notifications");
    expect(client.navigate).toHaveBeenCalledWith("https://mwezora.test/notifications");
    expect(navigated.focus).toHaveBeenCalledOnce();
  });

  it("focuses an existing destination tab before considering other windows", async () => {
    const other = { url: "https://mwezora.test/products", navigate: vi.fn(), focus: vi.fn() };
    const destination = { url: "https://mwezora.test/notifications", navigate: vi.fn(), focus: vi.fn(async () => undefined) };
    const harness = notificationWorker([other, destination]);
    await harness.click("/notifications");
    expect(destination.focus).toHaveBeenCalledOnce();
    expect(other.navigate).not.toHaveBeenCalled();
  });

  it("opens a window only when no reusable Mwezora client exists", async () => {
    const opened = { url: "https://mwezora.test/notifications", focus: vi.fn(async () => undefined) };
    const openWindow = vi.fn(async () => opened);
    const harness = notificationWorker([], openWindow);
    await harness.click("/notifications");
    expect(openWindow).toHaveBeenCalledWith("https://mwezora.test/notifications");
    expect(opened.focus).toHaveBeenCalledOnce();
  });

  it("does not reuse a window outside Mwezora's origin", async () => {
    const unrelated = { url: "https://unrelated.example/products", navigate: vi.fn(), focus: vi.fn() };
    const openWindow = vi.fn(async () => null);
    const harness = notificationWorker([unrelated], openWindow);
    await harness.click("/notifications");
    expect(unrelated.navigate).not.toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledWith("https://mwezora.test/notifications");
  });

  it("contains focus failures without opening a duplicate destination tab", async () => {
    const destination = { url: "https://mwezora.test/notifications", focus: vi.fn(async () => { throw new Error("focus blocked"); }) };
    const openWindow = vi.fn();
    const harness = notificationWorker([destination], openWindow);
    await expect(harness.click("/notifications")).resolves.toBeUndefined();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("falls back to a new window after navigation failure, without unhandled focus/open failures", async () => {
    const client = { url: "https://mwezora.test/products", navigate: vi.fn(async () => { throw new Error("closed"); }), focus: vi.fn() };
    const openWindow = vi.fn(async () => { throw new Error("blocked"); });
    const harness = notificationWorker([client], openWindow);
    await expect(harness.click("/notifications")).resolves.toBeUndefined();
    expect(openWindow).toHaveBeenCalledWith("https://mwezora.test/notifications");
  });

  it("rejects external notification destinations and keeps offline worker behavior intact", async () => {
    const openWindow = vi.fn(async () => null);
    const harness = notificationWorker([], openWindow);
    await harness.click("https://evil.example/");
    expect(openWindow).toHaveBeenCalledWith("https://mwezora.test/notifications");
    const source = fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
    expect(source).toContain("caches.match(OFFLINE_URL)");
    expect(source).toContain('event.data?.type === "SKIP_WAITING"');
  });
});
