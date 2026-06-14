export const VOICE_SEARCH_UNSUPPORTED_MSG = "Reconnaissance vocale non supportée par ce navigateur.";

export const VOICE_SEARCH_INSECURE_CONTEXT_MSG =
  "La reconnaissance vocale nécessite une connexion HTTPS sécurisée (https://).";

export const VOICE_SEARCH_MICROPHONE_DENIED_MSG = "Microphone refusé.";

export const VOICE_SEARCH_SERVICE_UNAVAILABLE_MSG = "Service vocal indisponible.";

export const VOICE_SEARCH_NETWORK_ERROR_MSG = "Erreur réseau du moteur de reconnaissance vocale.";

export const VOICE_SEARCH_BRAVE_FALLBACK_MSG =
  "Service vocal indisponible sur ce navigateur. Sur Brave, désactivez Shields pour ce site ou utilisez Chrome/Edge.";

export const VOICE_SEARCH_NO_SPEECH_MSG = "Aucune parole détectée. Réessayez en parlant près du micro.";

export const VOICE_SEARCH_AUDIO_CAPTURE_MSG = "Microphone introuvable ou indisponible sur cet appareil.";

export const VOICE_SEARCH_GENERIC_ERROR_MSG = "La recherche vocale est momentanément indisponible. Réessayez.";

/** Durée max d'écoute avant arrêt automatique (Chrome coupe souvent vers 5–7 s sans réglage). */
export const VOICE_SEARCH_MAX_LISTEN_MS = 12_000;

/** Nombre de relances après une erreur no-speech sans transcript capturé. */
export const VOICE_SEARCH_NO_SPEECH_RETRY_MAX = 1;

/** @deprecated use VOICE_SEARCH_MICROPHONE_DENIED_MSG */
export const VOICE_SEARCH_PERMISSION_DENIED_MSG = VOICE_SEARCH_MICROPHONE_DENIED_MSG;

type SpeechRecognitionCtor = new () => SpeechRecognition;

export function getSpeechRecognitionConstructor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function isVoiceSearchSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext === true;
}

export function isLikelyBraveBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { brave?: { isBrave?: unknown } };
  return typeof nav.brave?.isBrave === "function";
}

export function getVoiceSearchDiagnostics(): Record<string, unknown> {
  if (typeof window === "undefined") {
    return { available: false };
  }

  return {
    secureContext: window.isSecureContext,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    speechRecognition: isSpeechRecognitionSupported(),
    speechApi:
      typeof window.SpeechRecognition === "function"
        ? "SpeechRecognition"
        : typeof window.webkitSpeechRecognition === "function"
          ? "webkitSpeechRecognition"
          : null,
    likelyBrave: isLikelyBraveBrowser(),
    userAgent: navigator.userAgent,
  };
}

export async function queryMicrophonePermission(): Promise<PermissionState | "unknown"> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown";
  }

  try {
    const result = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return result.state;
  } catch {
    return "unknown";
  }
}

export function createSpeechRecognitionInstance(): SpeechRecognition | null {
  const Ctor = getSpeechRecognitionConstructor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = "fr-FR";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  return recognition;
}

export function mapSpeechRecognitionError(code: string, options?: { likelyBrave?: boolean }): string {
  switch (code) {
    case "not-allowed":
      return VOICE_SEARCH_MICROPHONE_DENIED_MSG;
    case "service-not-allowed":
      return options?.likelyBrave ? VOICE_SEARCH_BRAVE_FALLBACK_MSG : VOICE_SEARCH_SERVICE_UNAVAILABLE_MSG;
    case "no-speech":
      return VOICE_SEARCH_NO_SPEECH_MSG;
    case "aborted":
      return "";
    case "audio-capture":
      return VOICE_SEARCH_AUDIO_CAPTURE_MSG;
    case "network":
      return options?.likelyBrave ? VOICE_SEARCH_BRAVE_FALLBACK_MSG : VOICE_SEARCH_NETWORK_ERROR_MSG;
    default:
      return VOICE_SEARCH_GENERIC_ERROR_MSG;
  }
}

export function logVoiceSearchError(event: SpeechRecognitionErrorEvent, context?: Record<string, unknown>): void {
  console.error("[Voice Search Error]", event.error, event.message || "", {
    ...getVoiceSearchDiagnostics(),
    ...context,
  });
}

export function extractTranscript(event: SpeechRecognitionEvent): string {
  const results = event.results;
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const result = results.item(index);
    if (!result?.isFinal) continue;
    const alternative = result.item(0);
    const text = alternative?.transcript?.trim();
    if (text) return text;
  }

  const fallback = results.item(results.length - 1);
  if (!fallback) return "";
  const alternative = fallback.item(0);
  return alternative?.transcript?.trim() ?? "";
}

/** Dernier segment reconnu — interim ou final — pour affichage immédiat. */
export function extractLatestTranscript(event: SpeechRecognitionEvent): {
  text: string;
  isFinal: boolean;
} {
  const latest = event.results.item(event.results.length - 1);
  if (!latest) return { text: "", isFinal: false };
  const alternative = latest.item(0);
  return {
    text: alternative?.transcript?.trim() ?? "",
    isFinal: latest.isFinal,
  };
}
