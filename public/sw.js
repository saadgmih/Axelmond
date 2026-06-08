self.addEventListener("push", (event) => {
  let payload = { title: "Axelmond", body: "Nouvelle notification", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* ignore malformed payloads */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Axelmond", {
      body: payload.body || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: { url: payload.url || "/" },
      tag: payload.notificationId || undefined,
      renotify: false,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
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
