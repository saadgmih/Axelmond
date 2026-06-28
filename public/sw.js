const STATIC_CACHE = "performance-academique-static-v1";
const STATIC_ASSETS = ["/logo.png", "/logo-symbol.png", "/logo-full.png", "/manifest.json"];

function sanitizeNotificationUrl(raw) {
  try {
    const url = new URL(raw || "/", self.location.origin);
    if (url.origin !== self.location.origin) return "/";
    if (!url.pathname.startsWith("/")) return "/";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}

function isCacheableStaticRequest(request, url) {
  if (request.method !== "GET") return false;
  if (url.origin !== self.location.origin) return false;
  if (url.pathname === "/sw.js") return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (STATIC_ASSETS.includes(url.pathname)) return true;
  if (url.pathname.startsWith("/assets/")) return true;
  return /\.(svg|png|jpg|jpeg|webp|ico|woff2?)$/i.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!isCacheableStaticRequest(event.request, url)) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);
      if (response.ok) {
        await cache.put(event.request, response.clone());
      }
      return response;
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Performance Académique", body: "Nouvelle notification", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* ignore malformed payloads */
  }

  const safeUrl = sanitizeNotificationUrl(payload.url);

  event.waitUntil(
    self.registration.showNotification(payload.title || "Performance Académique", {
      body: payload.body || "",
      icon: "/logo.png",
      badge: "/logo-symbol.png",
      data: { url: safeUrl },
      tag: payload.notificationId || undefined,
      renotify: false,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = sanitizeNotificationUrl(event.notification.data?.url || "/");
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return undefined;
    }),
  );
});
