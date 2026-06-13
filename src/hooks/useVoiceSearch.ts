import { useCallback, useEffect, useRef, useState } from "react";
import {
  VOICE_SEARCH_INSECURE_CONTEXT_MSG,
  VOICE_SEARCH_MAX_LISTEN_MS,
  VOICE_SEARCH_MICROPHONE_DENIED_MSG,
  VOICE_SEARCH_NO_SPEECH_RETRY_MAX,
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
  const listenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noSpeechRetryRef = useRef(0);
  const hasTranscriptRef = useRef(false);
  const isSupported = isSpeechRecognitionSupported();

  const clearListenTimeout = useCallback(() => {
    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearListenTimeout();
    recognitionRef.current?.stop();
    setIsListening(false);
  }, [clearListenTimeout]);

  const clearError = useCallback(() => setError(null), []);

  const armListenTimeout = useCallback(
    (recognition: SpeechRecognition) => {
      clearListenTimeout();
      listenTimeoutRef.current = setTimeout(() => {
        console.info("[Voice Search] max listen duration reached", VOICE_SEARCH_MAX_LISTEN_MS);
        recognition.stop();
      }, VOICE_SEARCH_MAX_LISTEN_MS);
    },
    [clearListenTimeout],
  );

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

    clearListenTimeout();
    noSpeechRetryRef.current = 0;
    hasTranscriptRef.current = false;

    const recognition = createSpeechRecognitionInstance();
    if (!recognition) {
      setError(VOICE_SEARCH_UNSUPPORTED_MSG);
      return;
    }

    const likelyBrave = isLikelyBraveBrowser();
    setError(null);

    const tryRestartAfterNoSpeech = (): boolean => {
      if (hasTranscriptRef.current || noSpeechRetryRef.current >= VOICE_SEARCH_NO_SPEECH_RETRY_MAX) {
        return false;
      }
      noSpeechRetryRef.current += 1;
      console.info("[Voice Search] no-speech retry", noSpeechRetryRef.current);
      try {
        recognition.start();
        armListenTimeout(recognition);
        setIsListening(true);
        return true;
      } catch (err) {
        console.error("[Voice Search Error]", "no-speech-retry-failed", err);
        return false;
      }
    };

    recognition.onstart = () => {
      console.info("[Voice Search] recognition started");
      setIsListening(true);
      armListenTimeout(recognition);
    };
    recognition.onend = () => {
      console.info("[Voice Search] recognition ended");
      clearListenTimeout();
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech" && tryRestartAfterNoSpeech()) {
        return;
      }

      logVoiceSearchError(event, {
        microphonePermission: micPermission,
        likelyBrave,
        noSpeechRetries: noSpeechRetryRef.current,
      });
      clearListenTimeout();
      const message = mapSpeechRecognitionError(event.error, { likelyBrave });
      if (message) setError(message);
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onresult = (event) => {
      const transcript = extractTranscript(event);
      if (!transcript) return;

      const latestResult = event.results.item(event.results.length - 1);
      if (latestResult && !latestResult.isFinal) return;

      hasTranscriptRef.current = true;
      console.info("[Voice Search] transcript", transcript);
      onTranscript(transcript);
      clearListenTimeout();
      recognition.stop();
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("[Voice Search Error]", "start-failed", err, getVoiceSearchDiagnostics());
      clearListenTimeout();
      setError(VOICE_SEARCH_UNSUPPORTED_MSG);
      setIsListening(false);
      recognitionRef.current = null;
    }
  }, [armListenTimeout, clearListenTimeout, onTranscript]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }
    void startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      clearListenTimeout();
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, [clearListenTimeout]);

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
