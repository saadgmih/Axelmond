import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function usePushNotifications(enabled: boolean) {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, [enabled]);

  const subscribe = useCallback(async () => {
    if (!enabled || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("Notifications push non supportées sur cet appareil.");
      return false;
    }

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") {
        setStatus("Permission de notification refusée.");
        return false;
      }

      const { publicKey } = await api.getVapidPublicKey();
      if (!publicKey) {
        setStatus("Notifications push non configurées sur le serveur.");
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setStatus("Abonnement push invalide.");
        return false;
      }

      await api.subscribePushNotifications({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setStatus("Notifications push activées.");
      return true;
    } catch (err: any) {
      setStatus(err?.message || "Activation des notifications push impossible.");
      return false;
    }
  }, [enabled]);

  return { permission, status, subscribe };
}
