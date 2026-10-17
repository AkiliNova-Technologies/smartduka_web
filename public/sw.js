const CACHE_NAME = "mwezora-public-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/mwezora-app-192.png",
  "/mwezora-app-512.png",
  "/mwezora-horizontal-classic.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("mwezora-public-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

function safeInternalPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.length > 500) return "/notifications";
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/notifications";
  } catch { return "/notifications"; }
}

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() ?? {}; } catch { payload = {}; }
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.slice(0, 160) : "Mwezora";
  const body = typeof payload.body === "string" ? payload.body.slice(0, 1000) : "You have a new update.";
  const path = safeInternalPath(payload.path);
  // Only bounded server-generated tags are honored. Transactional tags are
  // opaque event hashes, so they do not disclose order or account identifiers.
  const tag = payload.tag === "mwezora-push-test" || (typeof payload.tag === "string" && /^mwezora:transactional:[a-f0-9]{24}$/.test(payload.tag))
    ? payload.tag
    : `mwezora:${path}:${title}`;
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/mwezora-app-192.png",
    badge: "/mwezora-app-192.png",
    tag,
    renotify: false,
    data: { path },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = safeInternalPath(event.notification.data?.path);
  event.waitUntil((async () => {
    const target = new URL(path, self.location.origin).href;
    let windows = [];
    try {
      windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    } catch {
      // A browser may reject client enumeration while shutting down.
    }

    const scope = new URL(self.registration.scope);
    const isMwezoraWindow = (client) => {
      try {
        const url = new URL(client.url);
        return url.origin === self.location.origin && url.pathname.startsWith(scope.pathname);
      } catch { return false; }
    };
    const isDestination = (client) => {
      try { return new URL(client.url).href === target; } catch { return false; }
    };
    const focusSafely = async (client) => {
      if (!client || typeof client.focus !== "function") return false;
      try { await client.focus(); return true; } catch { return false; }
    };
    const candidates = windows.filter(isMwezoraWindow);

    // Prefer a tab already at the exact internal destination. It avoids a
    // needless navigation and avoids opening a duplicate browser tab.
    const currentDestination = candidates.find(isDestination);
    if (currentDestination) {
      await focusSafely(currentDestination);
      return;
    }

    for (const client of candidates) {
      if (typeof client.navigate !== "function") continue;
      try {
        // Browsers can return null if the client was closed while navigating.
        const navigated = await client.navigate(target);
        if (!navigated) continue;
        // Focus the returned WindowClient, not the stale pre-navigation one.
        await focusSafely(navigated);
        return;
      } catch {
        // Try another existing Mwezora window before opening a new one.
      }
    }

    try {
      const opened = await self.clients.openWindow(target);
      await focusSafely(opened);
    } catch {
      // Opening may be blocked by browser or installed-PWA policy. There is no
      // safe fallback beyond the already validated internal destination.
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  const isPublicBrandAsset =
    url.pathname.startsWith("/images/promotions/") ||
    url.pathname.startsWith("/illustrations/") ||
    url.pathname.startsWith("/mwezora-");

  if (isPublicBrandAsset) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});
