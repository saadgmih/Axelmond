import assert from "node:assert/strict";
import fs from "node:fs";
import {
  VOICE_SEARCH_BRAVE_FALLBACK_MSG,
  VOICE_SEARCH_MICROPHONE_DENIED_MSG,
  VOICE_SEARCH_NETWORK_ERROR_MSG,
  VOICE_SEARCH_NO_SPEECH_MSG,
  VOICE_SEARCH_SERVICE_UNAVAILABLE_MSG,
  VOICE_SEARCH_UNSUPPORTED_MSG,
  extractTranscript,
  mapSpeechRecognitionError,
} from "../src/utils/voiceSearch.ts";

const topbarSource = fs.readFileSync("src/components/Topbar.tsx", "utf8");
const hookSource = fs.readFileSync("src/hooks/useVoiceSearch.ts", "utf8");
const utilsSource = fs.readFileSync("src/utils/voiceSearch.ts", "utf8");
const cssSource = fs.readFileSync("src/index.css", "utf8");
const packageSource = fs.readFileSync("package.json", "utf8");

assert.match(hookSource, /export function useVoiceSearch/);
assert.match(utilsSource, /webkitSpeechRecognition/);
assert.match(utilsSource, /createSpeechRecognitionInstance/);
assert.match(utilsSource, /continuous = true/);
assert.match(utilsSource, /interimResults = true/);
assert.match(utilsSource, /VOICE_SEARCH_MAX_LISTEN_MS = 12_000/);
assert.match(utilsSource, /lang = "fr-FR"/);
assert.match(utilsSource, /mapSpeechRecognitionError/);
assert.match(utilsSource, /logVoiceSearchError/);
assert.match(utilsSource, /queryMicrophonePermission/);
assert.match(utilsSource, /isVoiceSearchSecureContext/);

assert.match(hookSource, /logVoiceSearchError/);
assert.match(hookSource, /queryMicrophonePermission/);
assert.match(hookSource, /isVoiceSearchSecureContext/);
assert.match(hookSource, /VOICE_SEARCH_MAX_LISTEN_MS/);
assert.match(hookSource, /noSpeechRetryRef/);

assert.match(topbarSource, /useVoiceSearch/);
assert.match(topbarSource, /Mic/);
assert.match(topbarSource, /toggleListening/);
assert.match(topbarSource, /Écoute\.\.\./);
assert.match(topbarSource, /onTranscript: setSearchQuery/);
assert.match(topbarSource, /aria-pressed=\{isListening\}/);
assert.match(topbarSource, /voiceSearchError/);
assert.match(topbarSource, /Rechercher dans le catalogue/);

assert.match(cssSource, /voice-search-mic-active/);
assert.match(cssSource, /voice-search-mic-pulse/);

assert.match(packageSource, /voice-search\.test\.ts/);

assert.equal(mapSpeechRecognitionError("not-allowed"), VOICE_SEARCH_MICROPHONE_DENIED_MSG);
assert.equal(mapSpeechRecognitionError("service-not-allowed"), VOICE_SEARCH_SERVICE_UNAVAILABLE_MSG);
assert.equal(
  mapSpeechRecognitionError("service-not-allowed", { likelyBrave: true }),
  VOICE_SEARCH_BRAVE_FALLBACK_MSG,
);
assert.equal(mapSpeechRecognitionError("no-speech"), VOICE_SEARCH_NO_SPEECH_MSG);
assert.equal(mapSpeechRecognitionError("aborted"), "");
assert.equal(mapSpeechRecognitionError("network"), VOICE_SEARCH_NETWORK_ERROR_MSG);
assert.equal(
  mapSpeechRecognitionError("network", { likelyBrave: true }),
  VOICE_SEARCH_BRAVE_FALLBACK_MSG,
);
assert.equal(
  mapSpeechRecognitionError("unknown-code"),
  "La recherche vocale est momentanément indisponible. Réessayez.",
);

assert.equal(
  VOICE_SEARCH_UNSUPPORTED_MSG,
  "Reconnaissance vocale non supportée par ce navigateur.",
);

const mockEvent = {
  results: {
    item(index: number) {
      if (index !== 0) return undefined;
      return {
        isFinal: true,
        item(altIndex: number) {
          if (altIndex !== 0) return undefined;
          return { transcript: "  programmation python  ", confidence: 0.9 };
        },
      };
    },
  },
} as SpeechRecognitionEvent;

assert.equal(extractTranscript(mockEvent), "programmation python");

console.log("Voice search rules passed");
