import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import { Room, RoomEvent } from "livekit-client";
import { getClientErrorMessage } from "../../client-errors";
import type { AppUser } from "../../components/AuthScreen";
import type { LiveParticipantCard } from "../../components/VirtualClassroom";
import { api } from "../../api";
import { LiveChatMessage } from "../../livekit";
import { isStudentRole } from "../../rbac";
import type { Course, Invoice } from "../../types";
import {
  LIVE_SYNC_TOPIC,
  type LivePollState,
  type LiveSharedResource,
  type LiveSyncMessage,
  type LiveWhiteboardStroke,
} from "../../live/live-sync";
import { extractParticipantRole, validateIncomingLiveSyncMessage } from "../../live/live-sync-validation";

const ACTIVE_SPEAKER_SWITCH_DELAY_MS = 350;
const ACTIVE_SPEAKER_CLEAR_DELAY_MS = 900;

export interface UseLiveKitConnectionOptions {
  activeLiveCourse: Course | null;
  currentUser: AppUser | null;
  liveReconnectNonce: number;
  liveRoom: Room | null;
  activeSpeakerIdentity: string;
  liveSignals: Record<string, { handRaised?: boolean; reaction?: string; updatedAt: number }>;
  livePollRef: RefObject<LivePollState>;
  whiteboardStrokesRef: RefObject<LiveWhiteboardStroke[]>;
  sharedResourceRef: RefObject<LiveSharedResource | null>;
  setLiveRoom: Dispatch<SetStateAction<Room | null>>;
  setLiveParticipants: Dispatch<SetStateAction<LiveParticipantCard[]>>;
  setLiveChatMessages: Dispatch<SetStateAction<LiveChatMessage[]>>;
  setLiveStatusMsg: Dispatch<SetStateAction<string>>;
  setIsMicEnabled: Dispatch<SetStateAction<boolean>>;
  setIsCameraEnabled: Dispatch<SetStateAction<boolean>>;
  setIsScreenShareEnabled: Dispatch<SetStateAction<boolean>>;
  setActiveSpeakerIdentity: Dispatch<SetStateAction<string>>;
  setLiveSignals: Dispatch<
    SetStateAction<Record<string, { handRaised?: boolean; reaction?: string; updatedAt: number }>>
  >;
  setLiveAttendanceReport: Dispatch<SetStateAction<any | null>>;
  syncLiveParticipants: (room: Room) => void;
  appendLiveChatMessage: (message: LiveChatMessage) => void;
  applyIncomingLiveSyncMessage: (message: LiveSyncMessage, localIdentity: string) => void;
  respondToSyncRequest: (room: Room, requesterIdentity?: string) => Promise<void>;
  publishLiveSync: (room: Room | null, message: LiveSyncMessage) => Promise<void>;
  refreshLiveAttendanceReport: (courseId: number) => Promise<void>;
  updateSessionUser: (user: AppUser) => void;
  setEnrolledCourses: (ids: number[]) => void;
  setInvoices: (invoices: Invoice[]) => void;
  setCourseToPurchase: (course: Course | null) => void;
  onLiveEnded?: () => void;
  onRoomConnected?: (sessionId: string) => void;
}

export function useLiveKitConnection({
  activeLiveCourse,
  currentUser,
  liveReconnectNonce,
  liveRoom,
  activeSpeakerIdentity,
  liveSignals,
  livePollRef,
  whiteboardStrokesRef,
  sharedResourceRef: _sharedResourceRef,
  setLiveRoom,
  setLiveParticipants,
  setLiveChatMessages,
  setLiveStatusMsg,
  setIsMicEnabled,
  setIsCameraEnabled,
  setIsScreenShareEnabled,
  setActiveSpeakerIdentity,
  setLiveSignals,
  setLiveAttendanceReport,
  syncLiveParticipants,
  appendLiveChatMessage,
  applyIncomingLiveSyncMessage,
  respondToSyncRequest,
  publishLiveSync,
  refreshLiveAttendanceReport,
  updateSessionUser,
  setEnrolledCourses,
  setInvoices,
  setCourseToPurchase,
  onLiveEnded,
  onRoomConnected,
}: UseLiveKitConnectionOptions) {
  const activeSpeakerIdentityRef = useRef(activeSpeakerIdentity);
  const activeSpeakerSwitchTimerRef = useRef<number | null>(null);
  const activeSpeakerClearTimerRef = useRef<number | null>(null);
  const pendingActiveSpeakerIdentityRef = useRef("");

  useEffect(() => {
    activeSpeakerIdentityRef.current = activeSpeakerIdentity;
  }, [activeSpeakerIdentity]);

  useEffect(() => {
    if (!activeLiveCourse || !currentUser) return;

    let disposed = false;
    let liveEndedHandled = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    const refreshParticipants = () => syncLiveParticipants(room);
    const handleLiveEndedOnce = () => {
      if (liveEndedHandled) return;
      liveEndedHandled = true;
      onLiveEnded?.();
    };

    const handleDataReceived = async (payload: Uint8Array, participant: any, _kind: any, topic?: string) => {
      try {
        if (topic === LIVE_SYNC_TOPIC) {
          const parsed = JSON.parse(new TextDecoder().decode(payload));
          const message = validateIncomingLiveSyncMessage(parsed, {
            senderIdentity: participant?.identity || "",
            senderRole: participant ? extractParticipantRole(participant) : null,
            localIdentity: room.localParticipant.identity,
            currentPoll: livePollRef.current,
            currentStrokeCount: whiteboardStrokesRef.current.length,
            payloadSize: payload.byteLength,
          });
          if (!message) {
            console.warn("[livekit] Live sync message rejected", {
              type: typeof parsed === "object" && parsed ? (parsed as { type?: string }).type : "unknown",
              sender: participant?.identity || "server",
            });
            return;
          }
          if (message.type === "SYNC_REQUEST") {
            await respondToSyncRequest(room, participant?.identity);
            return;
          }
          if (message.type === "LIVE_ENDED") {
            if (currentUser && isStudentRole(currentUser.role)) {
              handleLiveEndedOnce();
            }
            return;
          }
          applyIncomingLiveSyncMessage(message, room.localParticipant.identity);
          return;
        }

        const parsed = JSON.parse(new TextDecoder().decode(payload));
        if (topic === "axelmond-live-action") {
          const identity = participant?.identity || parsed.identity || "unknown";
          setLiveSignals((prev) => ({
            ...prev,
            [identity]: {
              handRaised:
                parsed.action === "RAISE_HAND"
                  ? true
                  : parsed.action === "LOWER_HAND"
                    ? false
                    : prev[identity]?.handRaised,
              reaction:
                parsed.action === "REACTION_CLEAR"
                  ? undefined
                  : parsed.action === "REACTION"
                    ? typeof parsed.reaction === "string" && parsed.reaction
                      ? parsed.reaction
                      : undefined
                    : prev[identity]?.reaction,
              updatedAt: Date.now(),
            },
          }));
          return;
        }
        if (topic !== "axelmond-live-chat") return;
        appendLiveChatMessage({
          id: parsed.id || `${Date.now()}`,
          sender: participant?.name || parsed.sender || "Participant",
          text: parsed.text,
          time: parsed.time || new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        });
      } catch (err) {
        console.warn("[livekit] Invalid data payload", err);
      }
    };

    const closeIfLiveInactive = async () => {
      try {
        const latestCourse = await api.getCourse(activeLiveCourse.id);
        if (!disposed && !latestCourse?.isLiveNow) {
          handleLiveEndedOnce();
          return true;
        }
      } catch (err: any) {
        if (disposed) return false;
        if (err?.status === 403 || err?.status === 404) {
          handleLiveEndedOnce();
          return true;
        }
        console.warn("[livekit] Failed to verify live status", err);
      }
      return false;
    };

    const handleRoomDisconnected = () => {
      if (disposed || !currentUser || !isStudentRole(currentUser.role)) return;
      void closeIfLiveInactive();
    };

    const clearActiveSpeakerTimers = () => {
      if (activeSpeakerSwitchTimerRef.current !== null) {
        window.clearTimeout(activeSpeakerSwitchTimerRef.current);
        activeSpeakerSwitchTimerRef.current = null;
      }
      if (activeSpeakerClearTimerRef.current !== null) {
        window.clearTimeout(activeSpeakerClearTimerRef.current);
        activeSpeakerClearTimerRef.current = null;
      }
    };

    const commitActiveSpeakerIdentity = (identity: string) => {
      if (activeSpeakerIdentityRef.current === identity) return;
      activeSpeakerIdentityRef.current = identity;
      setActiveSpeakerIdentity(identity);
    };

    const handleActiveSpeakersChanged = (speakers: any[]) => {
      const active = speakers.find((speaker) => speaker.identity);
      const nextIdentity = active?.identity || "";

      if (!nextIdentity) {
        pendingActiveSpeakerIdentityRef.current = "";
        if (activeSpeakerSwitchTimerRef.current !== null) {
          window.clearTimeout(activeSpeakerSwitchTimerRef.current);
          activeSpeakerSwitchTimerRef.current = null;
        }
        if (!activeSpeakerIdentityRef.current || activeSpeakerClearTimerRef.current !== null) return;
        activeSpeakerClearTimerRef.current = window.setTimeout(() => {
          activeSpeakerClearTimerRef.current = null;
          if (pendingActiveSpeakerIdentityRef.current) return;
          commitActiveSpeakerIdentity("");
          syncLiveParticipants(room);
        }, ACTIVE_SPEAKER_CLEAR_DELAY_MS);
        return;
      }

      if (activeSpeakerClearTimerRef.current !== null) {
        window.clearTimeout(activeSpeakerClearTimerRef.current);
        activeSpeakerClearTimerRef.current = null;
      }

      if (!activeSpeakerIdentityRef.current || activeSpeakerIdentityRef.current === nextIdentity) {
        pendingActiveSpeakerIdentityRef.current = "";
        commitActiveSpeakerIdentity(nextIdentity);
        syncLiveParticipants(room);
        return;
      }

      pendingActiveSpeakerIdentityRef.current = nextIdentity;
      if (activeSpeakerSwitchTimerRef.current !== null) {
        window.clearTimeout(activeSpeakerSwitchTimerRef.current);
      }
      activeSpeakerSwitchTimerRef.current = window.setTimeout(() => {
        activeSpeakerSwitchTimerRef.current = null;
        if (pendingActiveSpeakerIdentityRef.current !== nextIdentity) return;
        pendingActiveSpeakerIdentityRef.current = "";
        commitActiveSpeakerIdentity(nextIdentity);
        syncLiveParticipants(room);
      }, ACTIVE_SPEAKER_SWITCH_DELAY_MS);
    };

    room
      .on(RoomEvent.ParticipantConnected, refreshParticipants)
      .on(RoomEvent.ParticipantDisconnected, refreshParticipants)
      .on(RoomEvent.TrackSubscribed, refreshParticipants)
      .on(RoomEvent.TrackUnsubscribed, refreshParticipants)
      .on(RoomEvent.LocalTrackPublished, refreshParticipants)
      .on(RoomEvent.LocalTrackUnpublished, refreshParticipants)
      .on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
      .on(RoomEvent.ConnectionQualityChanged, refreshParticipants)
      .on(RoomEvent.Disconnected, handleRoomDisconnected)
      .on(RoomEvent.DataReceived, handleDataReceived);

    setLiveStatusMsg("Connexion à la session en direct...");
    setLiveChatMessages([]);
    api
      .getLiveMessages(activeLiveCourse.id)
      .then((messages) => {
        if (!disposed) setLiveChatMessages(messages);
      })
      .catch((err) => console.warn("[livekit] Failed to load stored messages", err));

    const connectLiveRoom = async () => {
      const { url, token, sessionId } = await api.getLiveKitToken(activeLiveCourse.id);
      await room.connect(url, token);
      if (disposed) {
        await room.disconnect();
        return;
      }
      setLiveRoom(room);
      setLiveStatusMsg("Connecté à la session en direct");
      syncLiveParticipants(room);
      refreshLiveAttendanceReport(activeLiveCourse.id);
      await publishLiveSync(room, { type: "SYNC_REQUEST" });
      if (sessionId) onRoomConnected?.(sessionId);
      console.info("[livekit] Room connected", { courseId: activeLiveCourse.id, roomName: room.name });
    };

    const syncStudentEnrollment = async () => {
      const syncedUser = await api.me();
      updateSessionUser(syncedUser);
      setEnrolledCourses(syncedUser.enrolledCourses || []);
      setInvoices(syncedUser.invoices || []);
      return syncedUser;
    };

    const handleConnectionFailure = (err: any) => {
      console.error("[livekit] Room connection failed", err);
      const message = String(err?.message || err || "");
      if ((err as any)?.status === 403 && currentUser && isStudentRole(currentUser.role)) {
        (async () => {
          try {
            const syncedUser = await syncStudentEnrollment();
            if (syncedUser.enrolledCourses?.map(Number).includes(activeLiveCourse.id)) {
              if (disposed) return;
              setLiveStatusMsg("Accès live synchronisé. Reconnexion...");
              try {
                await connectLiveRoom();
              } catch (retryErr) {
                if (disposed) return;
                if ((retryErr as any)?.status === 403 && (await closeIfLiveInactive())) return;
                console.error("[livekit] Room connection retry failed", retryErr);
                setLiveStatusMsg(getClientErrorMessage(retryErr, "Connexion à la session en direct impossible"));
              }
              return;
            }
          } catch (syncErr) {
            console.warn("[student] Enrollment resync failed after LiveKit denial", syncErr);
          }
          if (disposed) return;
          setLiveStatusMsg(
            "Inscription au module requise pour rejoindre ce live. Activez votre accès depuis le catalogue.",
          );
          setCourseToPurchase(activeLiveCourse);
        })();
        return;
      }
      if (message.toLowerCase().includes("invalid token")) {
        setLiveStatusMsg("Connexion live impossible. Réessayez ou contactez le support.");
        return;
      }
      setLiveStatusMsg(getClientErrorMessage(err, "Connexion à la session en direct impossible"));
    };

    connectLiveRoom().catch(handleConnectionFailure);

    return () => {
      disposed = true;
      clearActiveSpeakerTimers();
      pendingActiveSpeakerIdentityRef.current = "";
      room.removeAllListeners();
      room.disconnect();
      setLiveRoom(null);
      setLiveParticipants([]);
      setIsMicEnabled(false);
      setIsCameraEnabled(false);
      setIsScreenShareEnabled(false);
      activeSpeakerIdentityRef.current = "";
      setActiveSpeakerIdentity("");
    };
  }, [activeLiveCourse?.id, currentUser?.id, liveReconnectNonce]);

  useEffect(() => {
    if (liveRoom) syncLiveParticipants(liveRoom);
  }, [activeSpeakerIdentity, liveSignals]);

  useEffect(() => {
    if (!activeLiveCourse) {
      setLiveAttendanceReport(null);
      return;
    }
    refreshLiveAttendanceReport(activeLiveCourse.id);
    const intervalDelay = currentUser && !isStudentRole(currentUser.role) ? 30000 : 90000;
    const interval = window.setInterval(() => refreshLiveAttendanceReport(activeLiveCourse.id), intervalDelay);
    return () => window.clearInterval(interval);
  }, [activeLiveCourse?.id, currentUser?.role]);
}
