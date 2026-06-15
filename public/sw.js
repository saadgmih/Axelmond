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

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "Axelmond", body: "Nouvelle notification", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* ignore malformed payloads */
  }

  const safeUrl = sanitizeNotificationUrl(payload.url);

  event.waitUntil(
    self.registration.showNotification(payload.title || "Axelmond", {
      body: payload.body || "",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
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
