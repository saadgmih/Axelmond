import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionQuality, Room, RoomEvent } from "livekit-client";
import type { LiveVideoQuality } from "../live/liveSettings";
import { applyLiveVideoQuality } from "../live/liveSettings";
import {
  buildAdaptiveQualityNotice,
  buildConnectionChangeNotice,
  buildManualQualityNotice,
  getAutoDefaultQuality,
  normalizeConnectionQuality,
  suggestAdaptiveQualityChange,
  type LiveConnectionLevel,
} from "../live/live-connection-notice";

export interface LiveConnectionNoticeState {
  message: string;
  variant: "success" | "warning" | "info";
}

interface UseLiveConnectionNoticeOptions {
  liveRoom: Room | null;
  videoQuality: LiveVideoQuality;
  cameraEnabled: boolean;
}

function mapLiveKitQuality(quality: ConnectionQuality): LiveConnectionLevel {
  switch (quality) {
    case ConnectionQuality.Excellent:
      return "excellent";
    case ConnectionQuality.Good:
      return "good";
    case ConnectionQuality.Poor:
      return "poor";
    case ConnectionQuality.Lost:
      return "lost";
    default:
      return "unknown";
  }
}

export function useLiveConnectionNotice({ liveRoom, videoQuality, cameraEnabled }: UseLiveConnectionNoticeOptions) {
  const [notice, setNotice] = useState<LiveConnectionNoticeState | null>(null);
  const [adaptiveQuality, setAdaptiveQuality] = useState<LiveVideoQuality>(getAutoDefaultQuality());
  const connectionRef = useRef<LiveConnectionLevel>("unknown");
  const previousVideoQualityRef = useRef<LiveVideoQuality>(videoQuality);
  const dismissTimerRef = useRef<number | null>(null);
  const lastNoticeAtRef = useRef(0);

  const pushNotice = useCallback((next: LiveConnectionNoticeState, force = false) => {
    const now = Date.now();
    if (!force && now - lastNoticeAtRef.current < 5000) return;
    lastNoticeAtRef.current = now;
    setNotice(next);
    if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      dismissTimerRef.current = null;
    }, 6000);
  }, []);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (previousVideoQualityRef.current === videoQuality) return;
    const manualNotice = buildManualQualityNotice(videoQuality);
    pushNotice(manualNotice, true);
    if (videoQuality === "auto") {
      setAdaptiveQuality(getAutoDefaultQuality());
    }
    previousVideoQualityRef.current = videoQuality;
  }, [videoQuality, pushNotice]);

  useEffect(() => {
    const effectiveQuality = videoQuality === "auto" ? adaptiveQuality : videoQuality;
    void applyLiveVideoQuality(liveRoom, effectiveQuality, cameraEnabled);
  }, [liveRoom, videoQuality, adaptiveQuality, cameraEnabled]);

  useEffect(() => {
    if (!liveRoom) {
      connectionRef.current = "unknown";
      return;
    }

    const handleQualityChanged = (quality: ConnectionQuality, participant: { isLocal?: boolean }) => {
      if (!participant?.isLocal) return;

      const next = mapLiveKitQuality(quality);
      const previous = connectionRef.current;
      connectionRef.current = next;

      const connectionNotice = buildConnectionChangeNotice(previous, next);
      if (connectionNotice) {
        pushNotice(connectionNotice);
      }

      if (videoQuality !== "auto" || !cameraEnabled) return;

      setAdaptiveQuality((current) => {
        const suggested = suggestAdaptiveQualityChange(next, current);
        if (!suggested || suggested === current) return current;
        const adaptiveNotice = buildAdaptiveQualityNotice(current, suggested);
        if (adaptiveNotice) {
          pushNotice(adaptiveNotice);
        }
        return suggested;
      });
    };

    connectionRef.current = mapLiveKitQuality(liveRoom.localParticipant.connectionQuality);
    liveRoom.on(RoomEvent.ConnectionQualityChanged, handleQualityChanged);
    return () => {
      liveRoom.off(RoomEvent.ConnectionQualityChanged, handleQualityChanged);
    };
  }, [liveRoom, videoQuality, cameraEnabled, pushNotice]);

  return notice;
}
