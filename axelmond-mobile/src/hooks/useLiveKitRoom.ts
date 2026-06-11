import { useCallback, useRef, useState } from "react";
import { api } from "../services/api";
import type { LiveKitSession } from "../types";

export type LiveConnectionState =
  | "idle"
  | "fetching"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export function useLiveKitRoom(courseId: number) {
  const [connectionState, setConnectionState] = useState<LiveConnectionState>("idle");
  const [session, setSession] = useState<LiveKitSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shouldConnect, setShouldConnect] = useState(false);
  const leaveRequestedRef = useRef(false);

  const joinRoom = useCallback(async () => {
    leaveRequestedRef.current = false;
    setError(null);
    setConnectionState("fetching");
    try {
      const payload = await api.getToken(courseId);
      if (leaveRequestedRef.current) return;
      setSession(payload);
      setShouldConnect(true);
      setConnectionState("connecting");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connexion LiveKit impossible";
      setError(message);
      setConnectionState("error");
      setShouldConnect(false);
      setSession(null);
    }
  }, [courseId]);

  const leaveRoom = useCallback(() => {
    leaveRequestedRef.current = true;
    setShouldConnect(false);
    setSession(null);
    setConnectionState("disconnected");
    setError(null);
  }, []);

  const handleConnected = useCallback(() => {
    if (leaveRequestedRef.current) return;
    setConnectionState("connected");
    setError(null);
  }, []);

  const handleDisconnected = useCallback(() => {
    setShouldConnect(false);
    setSession(null);
    setConnectionState(leaveRequestedRef.current ? "disconnected" : "disconnected");
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err.message || "Erreur LiveKit");
    setConnectionState("error");
    setShouldConnect(false);
  }, []);

  return {
    session,
    shouldConnect,
    connectionState,
    error,
    joinRoom,
    leaveRoom,
    handleConnected,
    handleDisconnected,
    handleError,
  };
}
