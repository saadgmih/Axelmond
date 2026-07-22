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
  extractLatestTranscript,
  mapSpeechRecognitionError,
} from "../src/utils/voiceSearch.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("voice-search", () => {
  const catalogSource = fs.readFileSync("src/views/student/StudentCatalogView.tsx", "utf8");
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
  assert.match(hookSource, /extractLatestTranscript/);

  assert.match(catalogSource, /useVoiceSearch/);
  assert.match(catalogSource, /Mic/);
  assert.match(catalogSource, /toggleListening/);
  assert.match(catalogSource, /Écoute\.\.\./);
  assert.match(catalogSource, /onTranscript: setSearchQuery/);
  assert.match(catalogSource, /aria-pressed=\{isListening\}/);
  assert.match(catalogSource, /voiceSearchError/);
  assert.match(catalogSource, /Rechercher dans le catalogue/);

  assert.match(cssSource, /voice-search-mic-active/);
  assert.match(cssSource, /voice-search-mic-pulse/);

  assert.match(packageSource, /"test":\s*"vitest run"/);

  assert.equal(mapSpeechRecognitionError("not-allowed"), VOICE_SEARCH_MICROPHONE_DENIED_MSG);
  assert.equal(mapSpeechRecognitionError("service-not-allowed"), VOICE_SEARCH_SERVICE_UNAVAILABLE_MSG);
  assert.equal(
    mapSpeechRecognitionError("service-not-allowed", { likelyBrave: true }),
    VOICE_SEARCH_BRAVE_FALLBACK_MSG,
  );
  assert.equal(mapSpeechRecognitionError("no-speech"), VOICE_SEARCH_NO_SPEECH_MSG);
  assert.equal(mapSpeechRecognitionError("aborted"), "");
  assert.equal(mapSpeechRecognitionError("network"), VOICE_SEARCH_NETWORK_ERROR_MSG);
  assert.equal(mapSpeechRecognitionError("network", { likelyBrave: true }), VOICE_SEARCH_BRAVE_FALLBACK_MSG);
  assert.equal(
    mapSpeechRecognitionError("unknown-code"),
    "La recherche vocale est momentanément indisponible. Réessayez.",
  );

  assert.equal(VOICE_SEARCH_UNSUPPORTED_MSG, "Reconnaissance vocale non supportée par ce navigateur.");

  const mockEvent = {
    results: {
      length: 1,
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

  const interimEvent = {
    results: {
      length: 1,
      item() {
        return {
          isFinal: false,
          item() {
            return { transcript: "  bonjour  ", confidence: 0.5 };
          },
        };
      },
    },
  } as unknown as SpeechRecognitionEvent;

  assert.deepEqual(extractLatestTranscript(interimEvent), {
    text: "bonjour",
    isFinal: false,
  });
  assert.deepEqual(extractLatestTranscript(mockEvent), {
    text: "programmation python",
    isFinal: true,
  });
});
