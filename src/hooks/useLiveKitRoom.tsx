import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { getClientErrorMessage } from "../client-errors";
import { Room, RoomEvent, Track } from "livekit-client";
import VirtualClassroom, {
  type LiveParticipantCard,
  type VirtualClassroomProps,
} from "../components/VirtualClassroom";
import type { AppUser } from "../components/AuthScreen";
import { api } from "../api";
import { LiveChatMessage } from "../livekit";
import { isStudentRole } from "../rbac";
import type { Course, Invoice } from "../types";
import {
  LIVE_SYNC_TOPIC,
  appendWhiteboardStroke,
  applyPollStart,
  buildSharedResource,
  createEmptyPoll,
  mergePollVote,
  type LivePollState,
  type LiveSharedResource,
  type LiveSyncMessage,
  type LiveWhiteboardStroke,
} from "../live/live-sync";
import {
  extractParticipantRole,
  isWhiteboardStrokeRateLimited,
  shouldPublishLiveSyncViaServer,
  trackWhiteboardStrokeTimestamp,
  validateIncomingLiveSyncMessage,
  validateOutgoingLiveSyncMessage,
} from "../live/live-sync-validation";

export type LiveKitClassroomBindings = Omit<
  VirtualClassroomProps,
  "mode" | "course" | "currentUserRole" | "onBack" | "onLeave"
>;

export interface UseLiveKitRoomOptions {
  activeLiveCourse: Course | null;
  setActiveLiveCourse: (course: Course | null) => void;
  currentUser: AppUser | null;
  courses: Course[];
  liveCourseId: number;
  setSelectedCourse: (course: Course | null) => void;
  setTeacherView: (view: string) => void;
  setCurrentView: (view: string) => void;
  setCourseToPurchase: (course: Course | null) => void;
  updateSessionUser: (user: AppUser) => void;
  setEnrolledCourses: (ids: number[]) => void;
  setInvoices: (invoices: Invoice[]) => void;
  getInitials: (name: string) => string;
  navigateTo: (view: string, targetCourse?: Course | null) => void;
  currentView: string;
  teacherView: string;
  handleToggleCourseLive?: (id: number) => Promise<Course | null>;
}

export function useLiveKitRoom({
  activeLiveCourse,
  setActiveLiveCourse,
  currentUser,
  courses,
  liveCourseId,
  setSelectedCourse,
  setTeacherView,
  setCurrentView,
  setCourseToPurchase,
  updateSessionUser,
  setEnrolledCourses,
  setInvoices,
  getInitials,
  navigateTo,
  currentView,
  teacherView,
  handleToggleCourseLive,
}: UseLiveKitRoomOptions) {
  const [liveRoom, setLiveRoom] = useState<Room | null>(null);
  const [liveParticipants, setLiveParticipants] = useState<LiveParticipantCard[]>([]);
  const [liveChatMessages, setLiveChatMessages] = useState<LiveChatMessage[]>([]);
  const [liveChatDraft, setLiveChatDraft] = useState("");
  const [liveStatusMsg, setLiveStatusMsg] = useState("");
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isScreenShareEnabled, setIsScreenShareEnabled] = useState(false);
  const [isLiveFullscreen, setIsLiveFullscreen] = useState(false);
  const [isLiveRecording, setIsLiveRecording] = useState(false);
  const [activeSpeakerIdentity, setActiveSpeakerIdentity] = useState("");
  const [liveSignals, setLiveSignals] = useState<
    Record<string, { handRaised?: boolean; reaction?: string; updatedAt: number }>
  >({});
  const liveSignalsRef = useRef(liveSignals);
  const [liveAttendanceReport, setLiveAttendanceReport] = useState<any | null>(null);
  const [liveReconnectNonce, setLiveReconnectNonce] = useState(0);
  const [livePoll, setLivePoll] = useState<LivePollState>(() => createEmptyPoll());
  const [myPollVote, setMyPollVote] = useState<string | null>(null);
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<LiveWhiteboardStroke[]>([]);
  const [sharedResource, setSharedResource] = useState<LiveSharedResource | null>(null);
  const whiteboardStrokesRef = useRef<LiveWhiteboardStroke[]>([]);
  const sharedResourceRef = useRef<LiveSharedResource | null>(null);
  const livePollRef = useRef<LivePollState>(createEmptyPoll());
  const whiteboardStrokeTimestampsRef = useRef<number[]>([]);
  const primaryLiveVideoRef = useRef<HTMLVideoElement | null>(null);
  const liveVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const liveAudioContainerRef = useRef<HTMLDivElement | null>(null);
  const liveStageRef = useRef<HTMLDivElement | null>(null);

  const canModerateLive = Boolean(currentUser && !isStudentRole(currentUser.role));

  useEffect(() => {
    whiteboardStrokesRef.current = whiteboardStrokes;
  }, [whiteboardStrokes]);

  useEffect(() => {
    sharedResourceRef.current = sharedResource;
  }, [sharedResource]);

  useEffect(() => {
    livePollRef.current = livePoll;
  }, [livePoll]);

  useEffect(() => {
    liveSignalsRef.current = liveSignals;
  }, [liveSignals]);

  const getParticipantVideoPublication = (participant: any) => {
    const publications = Array.from(participant.videoTrackPublications.values()) as any[];
    const screenShare = publications.find((pub) => pub.source === Track.Source.ScreenShare && pub.videoTrack);
    return screenShare || publications.find((pub) => pub.videoTrack);
  };

  const getParticipantAudioPublication = (participant: any) => {
    const publications = Array.from(participant.audioTrackPublications.values()) as any[];
    return publications.find((pub) => pub.audioTrack);
  };

  const getParticipantRole = (participant: any, fallbackRole?: string) => {
    return (
      participant?.attributes?.role ||
      (() => {
        try {
          return JSON.parse(participant?.metadata || "{}")?.role;
        } catch {
          return null;
        }
      })() ||
      fallbackRole ||
      "STUDENT"
    );
  };

  const syncLiveParticipants = (room: Room) => {
    const nextParticipants: LiveParticipantCard[] = [];
    const localName = room.localParticipant.name || currentUser?.fullName || "Vous";
    const localVideoPublication = getParticipantVideoPublication(room.localParticipant);
    const localAudioPublication = getParticipantAudioPublication(room.localParticipant);
    const localSignal = liveSignals[room.localParticipant.identity];
    nextParticipants.push({
      identity: room.localParticipant.identity,
      name: "Vous",
      initials: getInitials(localName),
      role: currentUser?.role || "STUDENT",
      avatarUrl: currentUser?.avatarUrl || null,
      isLocal: true,
      isSpeaking: activeSpeakerIdentity === room.localParticipant.identity,
      handRaised: localSignal?.handRaised,
      reaction: localSignal?.reaction,
      connectionQuality: String((room.localParticipant as any).connectionQuality || "stable"),
      hasAudio: Boolean(localAudioPublication && !localAudioPublication.isMuted),
      hasVideo: Boolean(localVideoPublication && !localVideoPublication.isMuted),
      audioTrackSid: localAudioPublication?.trackSid || null,
      videoTrackSid: localVideoPublication?.trackSid || null,
      videoTrack: localVideoPublication?.videoTrack,
      audioTrack: localAudioPublication?.audioTrack,
    });

    room.remoteParticipants.forEach((participant) => {
      const displayName = participant.name || participant.identity.replace(/^axelmond-user-/, "");
      const videoPublication = getParticipantVideoPublication(participant);
      const audioPublication = getParticipantAudioPublication(participant);
      const signal = liveSignals[participant.identity];
      let avatarUrl: string | null = null;
      try {
        avatarUrl = JSON.parse(participant.metadata || "{}")?.avatarUrl || null;
      } catch {
        avatarUrl = null;
      }
      nextParticipants.push({
        identity: participant.identity,
        name: displayName,
        initials: getInitials(displayName),
        role: getParticipantRole(participant),
        avatarUrl,
        isLocal: false,
        isSpeaking: activeSpeakerIdentity === participant.identity,
        handRaised: signal?.handRaised,
        reaction: signal?.reaction,
        connectionQuality: String((participant as any).connectionQuality || "stable"),
        joinedAtLabel: "Présence en temps réel",
        hasAudio: Boolean(audioPublication && !audioPublication.isMuted),
        hasVideo: Boolean(videoPublication && !videoPublication.isMuted),
        audioTrackSid: audioPublication?.trackSid || null,
        videoTrackSid: videoPublication?.trackSid || null,
        videoTrack: videoPublication?.videoTrack,
        audioTrack: audioPublication?.audioTrack,
      });
    });

    setLiveParticipants(nextParticipants);
  };

  const appendLiveChatMessage = (message: LiveChatMessage) => {
    setLiveChatMessages((prev) => [...prev.slice(-49), message]);
  };

  const publishLiveSync = async (room: Room | null, message: LiveSyncMessage) => {
    if (!room || !activeLiveCourse) return;

    const validated = validateOutgoingLiveSyncMessage(message, {
      localIdentity: room.localParticipant.identity,
      canModerate: canModerateLive,
      currentPoll: livePollRef.current,
      currentStrokeCount: whiteboardStrokesRef.current.length,
    });
    if (!validated) {
      console.warn("[livekit] Live sync publish rejected", { type: message.type });
      return;
    }

    try {
      if (shouldPublishLiveSyncViaServer(validated, canModerateLive)) {
        await api.publishLiveSync(activeLiveCourse.id, validated);
        return;
      }
      await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(validated)), {
        reliable: true,
        topic: LIVE_SYNC_TOPIC,
      });
    } catch (err) {
      console.error("[livekit] Live sync publish failed", err);
    }
  };

  const applyLiveSyncMessage = (message: LiveSyncMessage, localIdentity: string) => {
    switch (message.type) {
      case "WHITEBOARD_STROKE":
        setWhiteboardStrokes((prev) => appendWhiteboardStroke(prev, message.stroke));
        break;
      case "WHITEBOARD_CLEAR":
        setWhiteboardStrokes([]);
        break;
      case "WHITEBOARD_SNAPSHOT":
        setWhiteboardStrokes(message.strokes);
        break;
      case "POLL_START":
        setLivePoll(applyPollStart(message.question, message.options));
        setMyPollVote(null);
        break;
      case "POLL_SYNC":
        setLivePoll(message.poll);
        setMyPollVote(message.poll.voters[localIdentity] || null);
        break;
      case "POLL_VOTE":
        setLivePoll((prev) => mergePollVote(prev, message.voterId, message.option) || prev);
        if (message.voterId === localIdentity) {
          setMyPollVote(message.option);
        }
        break;
      case "POLL_END":
        setLivePoll((prev) => ({ ...prev, active: false }));
        break;
      case "RESOURCE_SHARE":
        setSharedResource(message.resource);
        break;
      case "RESOURCE_DISMISS":
        setSharedResource(null);
        break;
      default:
        break;
    }
  };

  const respondToLiveSyncRequest = async (room: Room, requesterIdentity?: string) => {
    if (!canModerateLive || !requesterIdentity || requesterIdentity === room.localParticipant.identity) return;

    if (whiteboardStrokesRef.current.length > 0) {
      await publishLiveSync(room, {
        type: "WHITEBOARD_SNAPSHOT",
        strokes: whiteboardStrokesRef.current,
      });
    }
    if (livePollRef.current.active) {
      await publishLiveSync(room, { type: "POLL_SYNC", poll: livePollRef.current });
    }
    if (sharedResourceRef.current) {
      await publishLiveSync(room, { type: "RESOURCE_SHARE", resource: sharedResourceRef.current });
    }
  };

  const refreshLiveAttendanceReport = async (courseId: number) => {
    try {
      const report = await api.getLiveAttendance(courseId);
      setLiveAttendanceReport(report);
    } catch (err) {
      console.warn("[livekit] Attendance report unavailable", err);
    }
  };

  const resetLiveKitState = () => {
    liveRoom?.disconnect();
    setActiveLiveCourse(null);
    setLiveRoom(null);
    setLiveParticipants([]);
    setLiveChatMessages([]);
    setLiveStatusMsg("");
    setLiveChatDraft("");
    setIsMicEnabled(false);
    setIsCameraEnabled(false);
    setIsScreenShareEnabled(false);
    setIsLiveFullscreen(false);
    setIsLiveRecording(false);
    setActiveSpeakerIdentity("");
    setLiveSignals({});
    setLiveAttendanceReport(null);
    setLivePoll(createEmptyPoll());
    setMyPollVote(null);
    setWhiteboardStrokes([]);
    setSharedResource(null);
  };

  const disconnectLiveSession = () => {
    liveRoom?.disconnect();
    setActiveLiveCourse(null);
    setLiveRoom(null);
    setLiveParticipants([]);
    setLiveChatMessages([]);
    setIsMicEnabled(false);
    setIsCameraEnabled(false);
    setIsScreenShareEnabled(false);
    setLivePoll(createEmptyPoll());
    setMyPollVote(null);
    setWhiteboardStrokes([]);
    setSharedResource(null);
  };

  useEffect(() => {
    if (!activeLiveCourse || !currentUser) return;

    let disposed = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    const refreshParticipants = () => syncLiveParticipants(room);
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
            await respondToLiveSyncRequest(room, participant?.identity);
            return;
          }
          applyLiveSyncMessage(message, room.localParticipant.identity);
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
                    ? (typeof parsed.reaction === "string" && parsed.reaction ? parsed.reaction : undefined)
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

    const handleActiveSpeakersChanged = (speakers: any[]) => {
      const active = speakers.find((speaker) => speaker.identity);
      setActiveSpeakerIdentity(active?.identity || "");
      syncLiveParticipants(room);
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
      .on(RoomEvent.DataReceived, handleDataReceived);

    setLiveStatusMsg("Connexion à la salle LiveKit...");
    setLiveChatMessages([]);
    api.getLiveMessages(activeLiveCourse.id)
      .then((messages) => {
        if (!disposed) setLiveChatMessages(messages);
      })
      .catch((err) => console.warn("[livekit] Failed to load stored messages", err));

    api.getLiveKitToken(activeLiveCourse.id)
      .then(async ({ url, token }) => {
        await room.connect(url, token);
        if (disposed) {
          await room.disconnect();
          return;
        }
        setLiveRoom(room);
        setLiveStatusMsg("Connecté à la salle LiveKit");
        syncLiveParticipants(room);
        refreshLiveAttendanceReport(activeLiveCourse.id);
        await publishLiveSync(room, { type: "SYNC_REQUEST" });
        console.info("[livekit] Room connected", { courseId: activeLiveCourse.id, roomName: room.name });
      })
      .catch((err) => {
        console.error("[livekit] Room connection failed", err);
        const message = String(err?.message || err || "");
        if ((err as any)?.status === 403 && currentUser && isStudentRole(currentUser.role)) {
          (async () => {
            try {
              const syncedUser = await api.me();
              updateSessionUser(syncedUser);
              setEnrolledCourses(syncedUser.enrolledCourses || []);
              setInvoices(syncedUser.invoices || []);
            } catch (syncErr) {
              console.warn("[student] Enrollment resync failed after LiveKit denial", syncErr);
            }
            setLiveStatusMsg("Inscription backend requise pour rejoindre ce live. Activez l'abonnement au module.");
            setCourseToPurchase(activeLiveCourse);
          })();
          return;
        }
        if (message.toLowerCase().includes("invalid token")) {
          setLiveStatusMsg(
            "Token LiveKit refusé : vérifiez LIVEKIT_API_KEY et LIVEKIT_API_SECRET côté serveur, puis redémarrez le serveur.",
          );
          return;
        }
        setLiveStatusMsg(getClientErrorMessage(err, "Connexion LiveKit impossible"));
      });

    return () => {
      disposed = true;
      room.removeAllListeners();
      room.disconnect();
      setLiveRoom(null);
      setLiveParticipants([]);
      setIsMicEnabled(false);
      setIsCameraEnabled(false);
      setIsScreenShareEnabled(false);
      setActiveSpeakerIdentity("");
    };
  }, [activeLiveCourse?.id, currentUser?.id, liveReconnectNonce]);

  useEffect(() => {
    const syncFullscreen = () => setIsLiveFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const liveMediaSignature = useMemo(
    () => liveParticipants
      .map((participant) => [
        participant.identity,
        participant.isLocal ? "local" : "remote",
        participant.videoTrack?.sid || "",
        participant.audioTrack?.sid || "",
      ].join(":"))
      .join("|"),
    [liveParticipants],
  );

  useEffect(() => {
    const primaryTrack =
      liveParticipants.find(
        (participant) => participant.identity === activeSpeakerIdentity && participant.videoTrack,
      )?.videoTrack ||
      liveParticipants.find((participant) => !participant.isLocal && participant.videoTrack)?.videoTrack ||
      liveParticipants.find((participant) => participant.videoTrack)?.videoTrack;

    if (primaryLiveVideoRef.current && primaryTrack) {
      primaryTrack.attach(primaryLiveVideoRef.current);
    }

    liveParticipants.forEach((participant) => {
      const videoElement = liveVideoRefs.current[participant.identity];
      if (videoElement && participant.videoTrack) {
        participant.videoTrack.attach(videoElement);
      }
    });

    const audioContainer = liveAudioContainerRef.current;
    if (audioContainer) {
      audioContainer.innerHTML = "";
      liveParticipants
        .filter((participant) => !participant.isLocal && participant.audioTrack)
        .forEach((participant) => {
          const audioElement = participant.audioTrack.attach();
          audioElement.autoplay = true;
          audioContainer.appendChild(audioElement);
        });
    }

    return () => {
      primaryTrack?.detach(primaryLiveVideoRef.current || undefined);
      liveParticipants.forEach((participant) => {
        if (participant.videoTrack) {
          participant.videoTrack.detach(liveVideoRefs.current[participant.identity] || undefined);
        }
        if (participant.audioTrack) {
          participant.audioTrack.detach();
        }
      });
    };
  }, [liveMediaSignature, currentView, teacherView, activeLiveCourse?.id, activeSpeakerIdentity]);

  useEffect(() => {
    if (liveRoom) syncLiveParticipants(liveRoom);
  }, [activeSpeakerIdentity, liveSignals]);

  useEffect(() => {
    if (!activeLiveCourse) {
      setLiveAttendanceReport(null);
      return;
    }
    refreshLiveAttendanceReport(activeLiveCourse.id);
    const interval = window.setInterval(() => refreshLiveAttendanceReport(activeLiveCourse.id), 15000);
    return () => window.clearInterval(interval);
  }, [activeLiveCourse?.id]);

  const joinTeacherLiveRoom = (courseOverride?: Course) => {
    const course = courseOverride ?? courses.find((c) => c.id === liveCourseId);
    if (!course) return;
    console.info("[livekit] Teacher opening live room", { courseId: course.id, role: currentUser?.role });
    setSelectedCourse(course);
    setActiveLiveCourse(course);
    setTeacherView("live-control");
  };

  const closeTeacherLiveRoom = () => {
    const course = activeLiveCourse;
    if (course) {
      api.leaveLiveAttendance(course.id).catch((err) => console.warn("[livekit] Attendance leave failed", err));
    }
    resetLiveKitState();
  };

  const toggleTeacherLiveSession = async (
    courseId: number,
    toggleCourseLive: (id: number) => Promise<Course | null>,
  ) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const isRoomOpen = activeLiveCourse?.id === courseId;

    if (course.isLiveNow) {
      if (isRoomOpen) {
        closeTeacherLiveRoom();
        await toggleCourseLive(courseId);
      } else {
        joinTeacherLiveRoom(course);
      }
      return;
    }

    const updatedCourse = await toggleCourseLive(courseId);
    if (updatedCourse) {
      joinTeacherLiveRoom(updatedCourse);
    }
  };

  const leaveLiveRoom = () => {
    const course = activeLiveCourse;
    if (course) {
      api.leaveLiveAttendance(course.id).catch((err) => console.warn("[livekit] Attendance leave failed", err));
    }
    resetLiveKitState();
    if (course && currentUser && isStudentRole(currentUser.role)) {
      setSelectedCourse(course);
      setCurrentView("course");
    }
  };

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
          setLiveStatusMsg("Microphone bloqué par le navigateur. Autorisez le micro via l'icône cadenas puis réessayez.");
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
      await liveRoom.localParticipant.setCameraEnabled(nextState);
      setIsCameraEnabled(nextState);
      syncLiveParticipants(liveRoom);
    } catch (err) {
      console.error("[livekit] Camera toggle failed", err);
      setLiveStatusMsg("Accès caméra refusé ou indisponible");
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
      api.saveLiveMessage(activeLiveCourse.id, message).catch((err) => console.error("[livekit] Chat persistence failed", err));
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
      api.logLiveEvent({ courseId: activeLiveCourse.id, action, details }).catch((err) =>
        console.warn("[livekit] Event persistence failed", err),
      );
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
        ? "Demande d'enregistrement journalisée. L'archivage vidéo nécessite une configuration LiveKit Egress côté infrastructure."
        : "Arrêt d'enregistrement journalisé.",
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
    setLiveStatusMsg("Reconnexion à la salle LiveKit...");
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
    api.logLiveEvent({
      courseId: activeLiveCourse.id,
      action: "POLL_START",
      details: { question: nextPoll.question, options: nextPoll.options },
    }).catch((err) => console.warn("[livekit] Poll event persistence failed", err));
  };

  const voteLivePoll = async (option: string) => {
    const voterId = liveRoom?.localParticipant.identity || String(currentUser?.id || "unknown");
    const merged = mergePollVote(livePollRef.current, voterId, option);
    if (!merged) return;
    setLivePoll(merged);
    setMyPollVote(option);
    await publishLiveSync(liveRoom, { type: "POLL_VOTE", voterId, option });
    if (activeLiveCourse) {
      api.logLiveEvent({
        courseId: activeLiveCourse.id,
        action: "POLL_VOTE",
        details: { option, question: livePollRef.current.question },
      }).catch((err) => console.warn("[livekit] Poll vote persistence failed", err));
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
    api.logLiveEvent({
      courseId: activeLiveCourse.id,
      action: "RESOURCE_SHARE",
      details: { title: resource.title, url: resource.url, kind: resource.kind },
    }).catch((err) => console.warn("[livekit] Resource share persistence failed", err));
  };

  const dismissLiveResource = async () => {
    if (!canModerateLive) return;
    setSharedResource(null);
    await publishLiveSync(liveRoom, { type: "RESOURCE_DISMISS" });
  };

  const classroomBindings: LiveKitClassroomBindings = {
    liveRoom,
    participants: liveParticipants,
    chatMessages: liveChatMessages,
    chatDraft: liveChatDraft,
    setChatDraft: setLiveChatDraft,
    statusMessage: liveStatusMsg,
    isMicEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    isFullscreen: isLiveFullscreen,
    isRecording: isLiveRecording,
    activeSpeakerIdentity,
    attendanceReport: liveAttendanceReport,
    primaryVideoRef: primaryLiveVideoRef,
    videoRefs: liveVideoRefs,
    stageRef: liveStageRef,
    onToggleMic: toggleLiveMic,
    onToggleCamera: toggleLiveCamera,
    onToggleScreenShare: toggleLiveScreenShare,
    onToggleFullscreen: toggleLiveFullscreen,
    onSendMessage: sendLiveChatMessage,
    onRaiseHand: toggleLiveHand,
    onReaction: sendLiveReaction,
    onRecordToggle: toggleLiveRecording,
    onModerateParticipant: handleLiveModeration,
    onLiveEvent: publishLiveAction,
    onReconnectLive: reconnectLiveSession,
    livePoll,
    myPollVote,
    onPublishPoll: publishLivePoll,
    onEndPoll: endLivePoll,
    onVotePoll: voteLivePoll,
    onPollQuestionChange: updateLivePollQuestion,
    whiteboardStrokes,
    localIdentity: liveRoom?.localParticipant.identity || String(currentUser?.id || "local"),
    onWhiteboardStroke: publishWhiteboardStroke,
    onWhiteboardClear: clearLiveWhiteboard,
    sharedResource,
    onShareResource: shareLiveResource,
    onDismissResource: dismissLiveResource,
  };

  const renderLiveRoomInterface = (mode: "student" | "teacher"): ReactNode => {
    if (!activeLiveCourse) return null;
    return (
      <VirtualClassroom
        {...classroomBindings}
        mode={mode}
        course={activeLiveCourse}
        currentUserRole={currentUser?.role || "STUDENT"}
        onBack={mode === "student" ? () => navigateTo("course", activeLiveCourse) : undefined}
        onLeave={leaveLiveRoom}
      />
    );
  };

  return {
    liveAudioContainerRef,
    joinTeacherLiveRoom,
    closeTeacherLiveRoom,
    toggleTeacherLiveSession,
    leaveLiveRoom,
    disconnectLiveSession,
    renderLiveRoomInterface,
    classroomBindings,
  };
}
