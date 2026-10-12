import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const publicPath = (path: string) => resolve(process.cwd(), "public", path.replace(/^\//, ""));

function pngSize(path: string) {
  const image = readFileSync(publicPath(path));
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
}

describe("cross-platform PWA compliance", () => {
  it("provides a stable, scoped standalone manifest", () => {
    const value = manifest();
    expect(value).toMatchObject({
      id: "/",
      name: "Mwezora",
      short_name: "Mwezora",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#FAF7F2",
      lang: "en",
      dir: "ltr",
    });
  });

  it("ships valid Android and Apple icon dimensions", () => {
    for (const [path, size] of [["/mwezora-app-192.png", 192], ["/mwezora-app-512.png", 512], ["/mwezora-app-maskable-192.png", 192], ["/mwezora-app-maskable-512.png", 512]] as const) {
      expect(existsSync(publicPath(path))).toBe(true);
      expect(pngSize(path)).toEqual({ width: size, height: size });
    }
    expect(pngSize("/apple-touch-icon.png")).toEqual({ width: 180, height: 180 });
    expect(manifest().icons?.filter((icon) => icon.purpose === "maskable")).toHaveLength(2);
  });

  it("keeps sensitive and transactional traffic out of service-worker caches", () => {
    const worker = source("public/sw.js");
    expect(worker).toContain('request.method !== "GET"');
    expect(worker).toContain('url.pathname.startsWith("/api/")');
    expect(worker).not.toMatch(/cache\.put\([^\n]*(api|checkout|payment|order|wishlist|cart)/i);
    expect(worker).toContain("caches.match(OFFLINE_URL)");
  });

  it("uses a waiting-worker update flow and protects critical or dirty screens", () => {
    const manager = source("src/components/pwa/PwaManager.tsx");
    expect(manager).toContain('worker.postMessage({ type: "SKIP_WAITING" })');
    expect(manager).toContain('const CRITICAL_PATHS = ["/checkout", "/payment"]');
    expect(manager).toContain("dirtyFormRef.current");
    expect(source("public/sw.js")).toContain('event.data?.type === "SKIP_WAITING"');
  });

  it("applies iOS metadata and safe-area layout handling", () => {
    const layout = source("src/app/layout.tsx");
    expect(layout).toContain("appleWebApp");
    expect(layout).toContain('viewportFit: "cover"');
    expect(source("src/components/layout/MobileCommerceNav.tsx")).toContain("safe-area-inset-bottom");
    expect(source("src/components/layout/Header.tsx")).toContain("safe-area-inset-top");
    expect(source("src/components/ui/sonner.tsx")).toContain("safe-area-inset-top");
  });

  it("offers platform-appropriate install guidance without showing in standalone mode", () => {
    const guide = source("src/components/pwa/InstallGuide.tsx");
    expect(guide).toContain('matchMedia("(display-mode: standalone)")');
    expect(guide).toContain("standalone?: boolean");
    expect(guide).toContain("beforeinstallprompt");
    expect(guide).toContain("Add to Home Screen");
    expect(guide).toContain("mwezora_install_guide_dismissed");
  });
});
