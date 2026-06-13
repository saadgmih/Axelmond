import { useCallback, useEffect, useRef, useState } from "react";
import {
  VOICE_SEARCH_INSECURE_CONTEXT_MSG,
  VOICE_SEARCH_MICROPHONE_DENIED_MSG,
  VOICE_SEARCH_UNSUPPORTED_MSG,
  createSpeechRecognitionInstance,
  extractTranscript,
  getVoiceSearchDiagnostics,
  isLikelyBraveBrowser,
  isSpeechRecognitionSupported,
  isVoiceSearchSecureContext,
  logVoiceSearchError,
  mapSpeechRecognitionError,
  queryMicrophonePermission,
} from "../utils/voiceSearch";

interface UseVoiceSearchOptions {
  onTranscript: (text: string) => void;
}

export function useVoiceSearch({ onTranscript }: UseVoiceSearchOptions) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSupported = isSpeechRecognitionSupported();

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const startListening = useCallback(async () => {
    console.info("[Voice Search] start requested", getVoiceSearchDiagnostics());

    if (!isVoiceSearchSecureContext()) {
      console.warn("[Voice Search] blocked: insecure context", getVoiceSearchDiagnostics());
      setError(VOICE_SEARCH_INSECURE_CONTEXT_MSG);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      console.warn("[Voice Search] blocked: SpeechRecognition API missing");
      setError(VOICE_SEARCH_UNSUPPORTED_MSG);
      return;
    }

    const micPermission = await queryMicrophonePermission();
    console.info("[Voice Search] microphone permission", micPermission);
    if (micPermission === "denied") {
      setError(VOICE_SEARCH_MICROPHONE_DENIED_MSG);
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    const recognition = createSpeechRecognitionInstance();
    if (!recognition) {
      setError(VOICE_SEARCH_UNSUPPORTED_MSG);
      return;
    }

    const likelyBrave = isLikelyBraveBrowser();
    setError(null);

    recognition.onstart = () => {
      console.info("[Voice Search] recognition started");
      setIsListening(true);
    };
    recognition.onend = () => {
      console.info("[Voice Search] recognition ended");
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (event) => {
      logVoiceSearchError(event, { microphonePermission: micPermission, likelyBrave });
      const message = mapSpeechRecognitionError(event.error, { likelyBrave });
      if (message) setError(message);
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onresult = (event) => {
      const transcript = extractTranscript(event);
      if (transcript) {
        console.info("[Voice Search] transcript", transcript);
        onTranscript(transcript);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("[Voice Search Error]", "start-failed", err, getVoiceSearchDiagnostics());
      setError(VOICE_SEARCH_UNSUPPORTED_MSG);
      setIsListening(false);
      recognitionRef.current = null;
    }
  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }
    void startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  return {
    isListening,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    clearError,
  };
}
