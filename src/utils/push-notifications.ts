export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const decode = typeof globalThis.atob === "function" ? globalThis.atob.bind(globalThis) : null;
  if (!decode) {
    throw new Error("Base64 decoding unavailable");
  }
  const rawData = decode(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isValidVapidPublicKey(publicKey: string): boolean {
  try {
    const bytes = urlBase64ToUint8Array(publicKey);
    return bytes.length === 65 && bytes[0] === 0x04;
  } catch {
    return false;
  }
}

export function mapPushSubscribeError(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("push service error") ||
    normalized.includes("push service not available") ||
    normalized.includes("registration failed")
  ) {
    return "Impossible de joindre le service push du navigateur. Vérifiez que les notifications sont activées pour Chrome/Edge dans les paramètres Windows, rechargez la page, puis réessayez.";
  }
  if (normalized.includes("permission") || normalized.includes("denied")) {
    return "Permission de notification refusée. Autorisez les notifications pour ce site dans les paramètres du navigateur.";
  }
  if (normalized.includes("service worker")) {
    return "Le service worker n'est pas prêt. Rechargez la page puis réessayez.";
  }
  if (normalized.includes("non configurées") || normalized.includes("not configured")) {
    return "Notifications push non configurées sur le serveur.";
  }
  return message || "Activation des notifications push impossible.";
}

export async function ensurePushServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service worker non supporté sur cet appareil.");
  }

  let registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) {
    registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  }

  await navigator.serviceWorker.ready;

  if (!registration.active) {
    await new Promise<void>((resolve, reject) => {
      const worker = registration.installing || registration.waiting;
      if (!worker) {
        reject(new Error("Service worker indisponible. Rechargez la page."));
        return;
      }

      const timeout = window.setTimeout(() => {
        reject(new Error("Service worker trop lent à démarrer. Rechargez la page."));
      }, 12000);

      worker.addEventListener("statechange", () => {
        if (registration.active) {
          window.clearTimeout(timeout);
          resolve();
        }
        if (worker.state === "redundant") {
          window.clearTimeout(timeout);
          reject(new Error("Service worker invalide. Rechargez la page."));
        }
      });
    });
  }

  return registration;
}

export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
  publicKey: string,
): Promise<PushSubscription> {
  const options: PushSubscriptionOptionsInit = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  };

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await existing.unsubscribe().catch(() => undefined);
  }

  try {
    return await registration.pushManager.subscribe(options);
  } catch (firstError) {
    console.error("[push] pushManager.subscribe first attempt failed", firstError);
    await registration.pushManager
      .getSubscription()
      .then((sub) => sub?.unsubscribe())
      .catch(() => undefined);
    try {
      return await registration.pushManager.subscribe(options);
    } catch (retryError) {
      console.error("[push] pushManager.subscribe retry failed", retryError);
      throw retryError;
    }
  }
}
