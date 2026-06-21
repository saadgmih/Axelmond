import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import { getClientErrorMessage } from "../../client-errors";
import type { LiveParticipantCard } from "../../components/VirtualClassroom";
import type { AppUser } from "../../components/AuthScreen";
import { api } from "../../api";
import { LiveChatMessage } from "../../livekit";
import { Room } from "livekit-client";
import type { Course } from "../../types";
import {
  DEFAULT_LIVE_CAMERA_FACING_MODE,
  liveCameraDeviceLabel,
  nextLiveCameraDevice,
  normalizeLiveCameraDevices,
  type LiveCameraDevice,
} from "../../live/live-camera";
import {
  appendWhiteboardStroke,
  applyPollStart,
  buildSharedResource,
  mergePollVote,
  type LivePollState,
  type LiveSharedResource,
  type LiveSyncMessage,
  type LiveWhiteboardStroke,
} from "../../live/live-sync";
import { isWhiteboardStrokeRateLimited, trackWhiteboardStrokeTimestamp } from "../../live/live-sync-validation";

export interface UseLiveRoomControlsOptions {
  liveRoom: Room | null;
  activeLiveCourse: Course | null;
  currentUser: AppUser | null;
  canModerateLive: boolean;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenShareEnabled: boolean;
  isLiveRecording: boolean;
  liveChatDraft: string;
  liveSignals: Record<string, { handRaised?: boolean; reaction?: string; updatedAt: number }>;
  livePollRef: RefObject<LivePollState>;
  whiteboardStrokesRef: RefObject<LiveWhiteboardStroke[]>;
  whiteboardStrokeTimestampsRef: RefObject<number[]>;
  liveSignalsRef: RefObject<Record<string, { handRaised?: boolean; reaction?: string; updatedAt: number }>>;
  liveStageRef: RefObject<HTMLDivElement | null>;
  setIsMicEnabled: Dispatch<SetStateAction<boolean>>;
  setIsCameraEnabled: Dispatch<SetStateAction<boolean>>;
  setIsScreenShareEnabled: Dispatch<SetStateAction<boolean>>;
  setIsLiveFullscreen: Dispatch<SetStateAction<boolean>>;
  setIsLiveRecording: Dispatch<SetStateAction<boolean>>;
  setLiveStatusMsg: Dispatch<SetStateAction<string>>;
  setLiveChatDraft: Dispatch<SetStateAction<string>>;
  setLiveSignals: Dispatch<
    SetStateAction<Record<string, { handRaised?: boolean; reaction?: string; updatedAt: number }>>
  >;
  setLivePoll: Dispatch<SetStateAction<LivePollState>>;
  setMyPollVote: Dispatch<SetStateAction<string | null>>;
  setWhiteboardStrokes: Dispatch<SetStateAction<LiveWhiteboardStroke[]>>;
  setSharedResource: Dispatch<SetStateAction<LiveSharedResource | null>>;
  setLiveRoom: Dispatch<SetStateAction<Room | null>>;
  setLiveParticipants: Dispatch<SetStateAction<LiveParticipantCard[]>>;
  setLiveReconnectNonce: Dispatch<SetStateAction<number>>;
  syncLiveParticipants: (room: Room) => void;
  appendLiveChatMessage: (message: LiveChatMessage) => void;
  publishLiveSync: (room: Room | null, message: LiveSyncMessage) => Promise<void>;
  refreshLiveAttendanceReport: (courseId: number) => Promise<void>;
}

export function useLiveRoomControls({
  liveRoom,
  activeLiveCourse,
  currentUser,
  canModerateLive,
  isMicEnabled,
  isCameraEnabled,
  isScreenShareEnabled,
  isLiveRecording,
  liveChatDraft,
  liveSignals,
  livePollRef,
  whiteboardStrokesRef: _whiteboardStrokesRef,
  whiteboardStrokeTimestampsRef,
  liveSignalsRef,
  liveStageRef,
  setIsMicEnabled,
  setIsCameraEnabled,
  setIsScreenShareEnabled,
  setIsLiveFullscreen,
  setIsLiveRecording,
  setLiveStatusMsg,
  setLiveChatDraft,
  setLiveSignals,
  setLivePoll,
  setMyPollVote,
  setWhiteboardStrokes,
  setSharedResource,
  setLiveRoom,
  setLiveParticipants,
  setLiveReconnectNonce,
  syncLiveParticipants,
  appendLiveChatMessage,
  publishLiveSync,
  refreshLiveAttendanceReport,
}: UseLiveRoomControlsOptions) {
  const [cameraDevices, setCameraDevices] = useState<LiveCameraDevice[]>([]);
  const [activeCameraDeviceId, setActiveCameraDeviceId] = useState<string | null>(null);

  const refreshCameraDevices = useCallback(async (): Promise<LiveCameraDevice[]> => {
    if (!liveRoom || typeof navigator === "undefined" || !navigator.mediaDevices) {
      setCameraDevices([]);
      setActiveCameraDeviceId(null);
      return [];
    }

    try {
      const devices = normalizeLiveCameraDevices(await Room.getLocalDevices("videoinput", false));
      setCameraDevices(devices);
      setActiveCameraDeviceId(liveRoom.getActiveDevice("videoinput") || null);
      return devices;
    } catch (err) {
      console.warn("[livekit] Camera enumeration failed", err);
      setCameraDevices([]);
      return [];
    }
  }, [liveRoom]);

  useEffect(() => {
    void refreshCameraDevices();
    if (!liveRoom || typeof navigator === "undefined" || !navigator.mediaDevices?.addEventListener) return;

    const handleDeviceChange = () => {
      void refreshCameraDevices();
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [liveRoom, refreshCameraDevices]);

  useEffect(() => {
    const syncFullscreen = () => setIsLiveFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, [setIsLiveFullscreen]);

  const getMicrophonePermissionState = async () => {
    if (!navigator.permissions?.query) return "unknown";
    try {
      const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
      return status.state;
    } catch {
      return "unknown";
    }
  };

  const toggleLiveMic = async () => {
    if (!liveRoom) return;
    try {
      const nextState = !isMicEnabled;
      if (nextState) {
        const permissionState = await getMicrophonePermissionState();
        if (permissionState === "denied") {
          setLiveStatusMsg(
            "Microphone bloqué par le navigateur. Autorisez le micro via l'icône cadenas puis réessayez.",
          );
          return;
        }
      }
      await liveRoom.localParticipant.setMicrophoneEnabled(nextState);
      setIsMicEnabled(nextState);
      setLiveStatusMsg(nextState ? "Microphone activé" : "Microphone coupé");
      syncLiveParticipants(liveRoom);
    } catch (err) {
      console.error("[livekit] Microphone toggle failed", err);
      setLiveStatusMsg("Microphone bloqué par le navigateur. Autorisez le micro via l'icône cadenas puis réessayez.");
    }
  };

  const toggleLiveCamera = async () => {
    if (!liveRoom) return;
    try {
      const nextState = !isCameraEnabled;
      if (nextState) {
        const selectedDeviceExists = cameraDevices.some((device) => device.deviceId === activeCameraDeviceId);
        if (selectedDeviceExists && activeCameraDeviceId) {
          try {
            await liveRoom.localParticipant.setCameraEnabled(true, {
              deviceId: { exact: activeCameraDeviceId },
            });
          } catch {
            setActiveCameraDeviceId(null);
          }
        }

        if (!liveRoom.localParticipant.isCameraEnabled) {
          try {
            await liveRoom.localParticipant.setCameraEnabled(true, {
              facingMode: DEFAULT_LIVE_CAMERA_FACING_MODE,
            });
          } catch {
            await liveRoom.localParticipant.setCameraEnabled(true);
          }
        }
      } else {
        await liveRoom.localParticipant.setCameraEnabled(false);
      }
      setIsCameraEnabled(nextState);
      setActiveCameraDeviceId(liveRoom.getActiveDevice("videoinput") || null);
      await refreshCameraDevices();
      syncLiveParticipants(liveRoom);
    } catch (err) {
      console.error("[livekit] Camera toggle failed", err);
      setLiveStatusMsg("Accès caméra refusé ou indisponible");
    }
  };

  const switchLiveCamera = async () => {
    if (!liveRoom || !isCameraEnabled) return;
    try {
      const devices = await refreshCameraDevices();
      const currentDeviceId = liveRoom.getActiveDevice("videoinput") || activeCameraDeviceId;
      const nextDevice = nextLiveCameraDevice(devices, currentDeviceId);
      if (!nextDevice) return;

      await liveRoom.switchActiveDevice("videoinput", nextDevice.deviceId);
      setActiveCameraDeviceId(nextDevice.deviceId);
      setLiveStatusMsg(
        `${liveCameraDeviceLabel(
          nextDevice,
          devices.findIndex((device) => device.deviceId === nextDevice.deviceId),
        )} sélectionnée`,
      );
      syncLiveParticipants(liveRoom);
    } catch (err) {
      console.error("[livekit] Camera switch failed", err);
      setLiveStatusMsg("Impossible de changer de caméra");
    }
  };

  const toggleLiveScreenShare = async () => {
    if (!liveRoom) return;
    try {
      const nextState = !isScreenShareEnabled;
      await liveRoom.localParticipant.setScreenShareEnabled(nextState);
      setIsScreenShareEnabled(nextState);
      syncLiveParticipants(liveRoom);
    } catch (err) {
      console.error("[livekit] Screen share toggle failed", err);
      setLiveStatusMsg("Partage d'écran refusé ou indisponible");
    }
  };

  const toggleLiveFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await liveStageRef.current?.requestFullscreen();
    } catch (err) {
      console.error("[livekit] Fullscreen toggle failed", err);
      setLiveStatusMsg("Plein écran indisponible dans ce navigateur");
    }
  };

  const sendLiveChatMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!liveRoom || !liveChatDraft.trim() || !currentUser || !activeLiveCourse) return;

    const message: LiveChatMessage = {
      id: `${Date.now()}-${currentUser.id}`,
      sender: currentUser.fullName,
      text: liveChatDraft.trim(),
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      isMe: true,
    };

    try {
      await liveRoom.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(message)), {
        reliable: true,
        topic: "axelmond-live-chat",
      });
      appendLiveChatMessage(message);
      api
        .saveLiveMessage(activeLiveCourse.id, message)
        .catch((err) => console.error("[livekit] Chat persistence failed", err));
      setLiveChatDraft("");
    } catch (err) {
      console.error("[livekit] Chat publish failed", err);
      setLiveStatusMsg("Message non envoyé");
    }
  };

  const publishLiveAction = async (action: string, details: Record<string, unknown> = {}) => {
    if (!activeLiveCourse || !currentUser) return;
    const payload = {
      action,
      identity: liveRoom?.localParticipant.identity,
      sender: currentUser.fullName,
      role: currentUser.role,
      ...details,
      time: new Date().toISOString(),
    };
    try {
      if (liveRoom) {
        await liveRoom.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(payload)), {
          reliable: true,
          topic: "axelmond-live-action",
        });
      }
      setLiveSignals((prev) => ({
        ...prev,
        [liveRoom?.localParticipant.identity || currentUser.id]: {
          handRaised:
            action === "RAISE_HAND"
              ? true
              : action === "LOWER_HAND"
                ? false
                : prev[liveRoom?.localParticipant.identity || currentUser.id]?.handRaised,
          reaction:
            action === "REACTION_CLEAR"
              ? undefined
              : action === "REACTION" && typeof details.reaction === "string"
                ? details.reaction
                : prev[liveRoom?.localParticipant.identity || currentUser.id]?.reaction,
          updatedAt: Date.now(),
        },
      }));
      api
        .logLiveEvent({ courseId: activeLiveCourse.id, action, details })
        .catch((err) => console.warn("[livekit] Event persistence failed", err));
      refreshLiveAttendanceReport(activeLiveCourse.id);
    } catch (err) {
      console.error("[livekit] Live action publish failed", err);
      setLiveStatusMsg("Action live non envoyée");
    }
  };

  const toggleLiveHand = () => {
    const identity = liveRoom?.localParticipant.identity || currentUser?.id || "";
    const isRaised = Boolean(liveSignals[identity]?.handRaised);
    publishLiveAction(isRaised ? "LOWER_HAND" : "RAISE_HAND");
  };

  const sendLiveReaction = (reaction: string) => {
    const identity = liveRoom?.localParticipant.identity || String(currentUser?.id || "");
    const current = liveSignalsRef.current[identity]?.reaction;
    if (current === reaction) {
      publishLiveAction("REACTION_CLEAR", { reaction });
      return;
    }
    publishLiveAction("REACTION", { reaction });
  };

  const toggleLiveRecording = () => {
    const nextState = !isLiveRecording;
    setIsLiveRecording(nextState);
    publishLiveAction(nextState ? "RECORDING_REQUESTED" : "RECORDING_STOPPED", {
      status: nextState ? "requested" : "stopped",
    });
    setLiveStatusMsg(
      nextState
        ? "Demande d'enregistrement enregistrée. L'archivage vidéo sera disponible prochainement."
        : "Arrêt d'enregistrement enregistré.",
    );
  };

  const handleLiveModeration = async (action: string, participant: LiveParticipantCard) => {
    if (!activeLiveCourse) return;
    const trackSid =
      action === "MUTE_AUDIO"
        ? participant.audioTrackSid
        : action === "MUTE_VIDEO"
          ? participant.videoTrackSid
          : undefined;
    try {
      await api.moderateLiveParticipant({
        courseId: activeLiveCourse.id,
        action,
        targetIdentity: participant.identity,
        targetName: participant.name,
        trackSid,
      });
      setLiveStatusMsg(`Action de modération appliquée : ${participant.name}`);
      refreshLiveAttendanceReport(activeLiveCourse.id);
    } catch (err: any) {
      console.error("[livekit] Moderation failed", err);
      setLiveStatusMsg(getClientErrorMessage(err, "Action de modération impossible"));
    }
  };

  const reconnectLiveSession = () => {
    if (!activeLiveCourse) return;
    setLiveStatusMsg("Reconnexion à la session en direct...");
    liveRoom?.disconnect();
    setLiveRoom(null);
    setLiveParticipants([]);
    setLiveReconnectNonce((value) => value + 1);
  };

  const publishLivePoll = async () => {
    if (!canModerateLive || !activeLiveCourse) return;
    const nextPoll = applyPollStart(livePollRef.current.question, livePollRef.current.options);
    setLivePoll(nextPoll);
    setMyPollVote(null);
    await publishLiveSync(liveRoom, {
      type: "POLL_START",
      question: nextPoll.question,
      options: nextPoll.options,
    });
    api
      .logLiveEvent({
        courseId: activeLiveCourse.id,
        action: "POLL_START",
        details: { question: nextPoll.question, options: nextPoll.options },
      })
      .catch((err) => console.warn("[livekit] Poll event persistence failed", err));
  };

  const voteLivePoll = async (option: string) => {
    const voterId = liveRoom?.localParticipant.identity || String(currentUser?.id || "unknown");
    const merged = mergePollVote(livePollRef.current, voterId, option);
    if (!merged) return;
    setLivePoll(merged);
    setMyPollVote(option);
    await publishLiveSync(liveRoom, { type: "POLL_VOTE", voterId, option });
    if (activeLiveCourse) {
      api
        .logLiveEvent({
          courseId: activeLiveCourse.id,
          action: "POLL_VOTE",
          details: { option, question: livePollRef.current.question },
        })
        .catch((err) => console.warn("[livekit] Poll vote persistence failed", err));
    }
  };

  const endLivePoll = async () => {
    if (!canModerateLive) return;
    setLivePoll((prev) => ({ ...prev, active: false }));
    await publishLiveSync(liveRoom, { type: "POLL_END" });
  };

  const updateLivePollQuestion = (question: string) => {
    setLivePoll((prev) => ({ ...prev, question }));
  };

  const publishWhiteboardStroke = async (stroke: LiveWhiteboardStroke) => {
    if (isWhiteboardStrokeRateLimited(whiteboardStrokeTimestampsRef.current)) {
      setLiveStatusMsg("Limite de tracés atteinte. Patientez quelques secondes.");
      return;
    }
    whiteboardStrokeTimestampsRef.current = trackWhiteboardStrokeTimestamp(whiteboardStrokeTimestampsRef.current);
    setWhiteboardStrokes((prev) => appendWhiteboardStroke(prev, stroke));
    await publishLiveSync(liveRoom, { type: "WHITEBOARD_STROKE", stroke });
  };

  const clearLiveWhiteboard = async () => {
    if (!canModerateLive) return;
    setWhiteboardStrokes([]);
    await publishLiveSync(liveRoom, { type: "WHITEBOARD_CLEAR" });
  };

  const shareLiveResource = async (title: string, url: string) => {
    if (!canModerateLive || !activeLiveCourse) return;
    const resource = buildSharedResource(title, url, currentUser?.fullName || "Animateur");
    if (!resource) return;
    setSharedResource(resource);
    await publishLiveSync(liveRoom, { type: "RESOURCE_SHARE", resource });
    api
      .logLiveEvent({
        courseId: activeLiveCourse.id,
        action: "RESOURCE_SHARE",
        details: { title: resource.title, url: resource.url, kind: resource.kind },
      })
      .catch((err) => console.warn("[livekit] Resource share persistence failed", err));
  };

  const dismissLiveResource = async () => {
    if (!canModerateLive) return;
    setSharedResource(null);
    await publishLiveSync(liveRoom, { type: "RESOURCE_DISMISS" });
  };

  return {
    toggleLiveMic,
    toggleLiveCamera,
    switchLiveCamera,
    canSwitchLiveCamera: isCameraEnabled && cameraDevices.length > 1,
    toggleLiveScreenShare,
    toggleLiveFullscreen,
    sendLiveChatMessage,
    publishLiveAction,
    toggleLiveHand,
    sendLiveReaction,
    toggleLiveRecording,
    handleLiveModeration,
    reconnectLiveSession,
    publishLivePoll,
    voteLivePoll,
    endLivePoll,
    updateLivePollQuestion,
    publishWhiteboardStroke,
    clearLiveWhiteboard,
    shareLiveResource,
    dismissLiveResource,
  };
}
