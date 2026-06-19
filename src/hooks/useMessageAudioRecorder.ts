import { useCallback, useEffect, useRef, useState } from "react";

const MIN_RECORDING_BYTES = 512;

function pickAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

function mimeToExtension(mimeType: string) {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "m4a";
  return "webm";
}

interface UseMessageAudioRecorderOptions {
  onRecorded: (file: File) => void | Promise<void>;
  onError: (message: string) => void;
}

export function useMessageAudioRecorder({ onRecorded, onError }: UseMessageAudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      onError("Enregistrement audio indisponible dans ce navigateur.");
      return;
    }

    const mimeType = pickAudioMimeType();
    if (!mimeType) {
      onError("Format audio non pris en charge par ce navigateur.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopStream();
        const normalizedMime = mimeType.split(";")[0] || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: normalizedMime });
        chunksRef.current = [];
        if (blob.size < MIN_RECORDING_BYTES) {
          onError("Enregistrement trop court. Maintenez le bouton micro un peu plus longtemps.");
          return;
        }
        const file = new File([blob], `message-vocal-${Date.now()}.${mimeToExtension(normalizedMime)}`, {
          type: normalizedMime,
        });
        void onRecorded(file);
      };
      recorder.onerror = () => {
        stopStream();
        setIsRecording(false);
        mediaRecorderRef.current = null;
        onError("Enregistrement audio interrompu.");
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      stopStream();
      onError("Microphone inaccessible. Autorisez le micro via l'icône cadenas du navigateur.");
    }
  }, [onError, onRecorded, stopStream]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
      return;
    }
    void startRecording();
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      stopStream();
    };
  }, [stopStream]);

  return { isRecording, toggleRecording, stopRecording };
}
