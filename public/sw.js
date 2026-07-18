const STATIC_CACHE = "performance-academique-static-v7";
const CACHE_PREFIX = "performance-academique-static-";

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
  if (request.headers.has("authorization")) return false;
  if (url.pathname === "/sw.js") return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (/\.(pdf|mp4|webm|mov|m4v|mp3|m4a|wav|ogg)$/i.test(url.pathname)) return false;
  if (["video", "audio", "document"].includes(request.destination)) return false;
  if (url.pathname === "/manifest.json") return true;
  if (url.pathname.startsWith("/assets/")) return true;
  return /\.(svg|png|jpg|jpeg|webp|ico|woff2?)$/i.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!isCacheableStaticRequest(event.request, url)) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const isVersionedAsset = url.pathname.startsWith("/assets/");
      const cached = await cache.match(event.request);
      if (isVersionedAsset && cached) return cached;

      try {
        const response = await fetch(event.request);
        const contentType = response.headers.get("content-type") || "";
        const isUnexpectedHtml = contentType.toLowerCase().includes("text/html") && url.pathname !== "/manifest.json";
        if (response.ok && !isUnexpectedHtml) await cache.put(event.request, response.clone());
        return response;
      } catch (error) {
        if (cached) return cached;
        throw error;
      }
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
      icon: "/performance-logo-e6657b8a.png",
      badge: "/performance-logo-e6657b8a.png",
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
