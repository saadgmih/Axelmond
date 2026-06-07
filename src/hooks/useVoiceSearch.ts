import { useCallback, useEffect, useRef, useState } from "react";
import {
  VOICE_SEARCH_UNSUPPORTED_MSG,
  createSpeechRecognitionInstance,
  extractTranscript,
  isSpeechRecognitionSupported,
  mapSpeechRecognitionError,
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

  const startListening = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      setError(VOICE_SEARCH_UNSUPPORTED_MSG);
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

    setError(null);

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (event) => {
      const message = mapSpeechRecognitionError(event.error);
      if (message) setError(message);
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onresult = (event) => {
      const transcript = extractTranscript(event);
      if (transcript) onTranscript(transcript);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
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
    startListening();
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
