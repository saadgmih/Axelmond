import { useCallback, useEffect, useState } from "react";
import { getClientErrorMessage } from "../client-errors";
import { api } from "../api";
import {
  ensurePushServiceWorker,
  isValidVapidPublicKey,
  mapPushSubscribeError,
  subscribeToPush,
} from "../utils/push-notifications";

export type PushStatusKind = "idle" | "success" | "error" | "info";

export function usePushNotifications(enabled: boolean) {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<PushStatusKind>("idle");

  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;
    ensurePushServiceWorker().catch(() => undefined);
  }, [enabled]);

  const subscribe = useCallback(async () => {
    if (!enabled || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatusKind("error");
      setStatus("Notifications push non supportées sur cet appareil.");
      return false;
    }

    if (!window.isSecureContext) {
      setStatusKind("error");
      setStatus("Les notifications push nécessitent une connexion HTTPS sécurisée.");
      return false;
    }

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") {
        setStatusKind("error");
        setStatus("Permission de notification refusée.");
        return false;
      }

      const { publicKey, configured } = await api.getVapidPublicKey();
      if (!publicKey || !isValidVapidPublicKey(publicKey)) {
        setStatusKind("error");
        setStatus("Notifications push non configurées correctement sur le serveur.");
        return false;
      }
      if (configured === false) {
        setStatusKind("error");
        setStatus("Notifications push partiellement configurées sur le serveur (clé privée manquante).");
        return false;
      }

      const registration = await ensurePushServiceWorker();
      const subscription = await subscribeToPush(registration, publicKey);
      const json = subscription.toJSON();

      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setStatusKind("error");
        setStatus("Abonnement push invalide.");
        return false;
      }

      await api.subscribePushNotifications({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });

      setStatusKind("success");
      setStatus("Notifications push activées.");
      return true;
    } catch (err: any) {
      console.error("[push] subscribe flow failed", {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
      });
      setStatusKind("error");
      setStatus(mapPushSubscribeError(getClientErrorMessage(err, "")));
      return false;
    }
  }, [enabled]);

  return { permission, status, statusKind, subscribe };
}
