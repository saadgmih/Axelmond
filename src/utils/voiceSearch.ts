export const VOICE_SEARCH_UNSUPPORTED_MSG =
  "La recherche vocale n'est pas supportée par ce navigateur.";

export const VOICE_SEARCH_PERMISSION_DENIED_MSG =
  "Accès au microphone refusé. Autorisez le micro dans les paramètres du navigateur pour utiliser la recherche vocale.";

export const VOICE_SEARCH_NO_SPEECH_MSG =
  "Aucune parole détectée. Réessayez en parlant près du micro.";

export const VOICE_SEARCH_GENERIC_ERROR_MSG =
  "La recherche vocale est momentanément indisponible. Réessayez.";

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

export function createSpeechRecognitionInstance(): SpeechRecognition | null {
  const Ctor = getSpeechRecognitionConstructor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = "fr-FR";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  return recognition;
}

export function mapSpeechRecognitionError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return VOICE_SEARCH_PERMISSION_DENIED_MSG;
    case "no-speech":
      return VOICE_SEARCH_NO_SPEECH_MSG;
    case "aborted":
      return "";
    case "audio-capture":
      return "Microphone introuvable ou indisponible sur cet appareil.";
    case "network":
      return "Connexion réseau requise pour la reconnaissance vocale.";
    default:
      return VOICE_SEARCH_GENERIC_ERROR_MSG;
  }
}

export function extractTranscript(event: SpeechRecognitionEvent): string {
  const result = event.results.item(0);
  if (!result) return "";
  const alternative = result.item(0);
  return alternative?.transcript?.trim() ?? "";
}
