import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Room } from "livekit-client";
import { Course } from "../types";
import { LiveChatMessage } from "../livekit";
import type { LiveParticipantCard } from "../components/VirtualClassroom";
import { resolveStageParticipants, stageGridClass } from "../components/live/live-stage";
import type { AttendanceRow } from "../components/live/LiveAttendancePanel";
import { liveRoleLabel, liveSidebarTabs } from "../components/live/live-classroom-formatters";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useLiveConnectionNotice } from "./useLiveConnectionNotice";
import { useLiveSettings } from "./useLiveSettings";
import { usePictureInPicture } from "./usePictureInPicture";
import { useTvNavigation } from "./useTvNavigation";

export interface UseVirtualClassroomUIParams {
  mode: "student" | "teacher";
  course: Course;
  currentUserRole: string;
  liveRoom: Room | null;
  participants: LiveParticipantCard[];
  chatMessages: LiveChatMessage[];
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isFullscreen: boolean;
  activeSpeakerIdentity: string;
  attendanceReport: unknown | null;
  primaryVideoRef: MutableRefObject<HTMLVideoElement | null>;
  videoRefs: MutableRefObject<Record<string, HTMLVideoElement | null>>;
  onBack?: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleFullscreen: () => void;
  onLeave?: () => void;
  onRaiseHand: () => void;
  onReconnectLive?: () => void;
  onShareResource: (title: string, url: string) => void;
}

export function useVirtualClassroomUI({
  mode,
  course,
  currentUserRole,
  liveRoom,
  participants,
  chatMessages,
  isMicEnabled,
  isCameraEnabled,
  isFullscreen,
  activeSpeakerIdentity,
  attendanceReport,
  primaryVideoRef,
  videoRefs,
  onBack,
  onToggleMic,
  onToggleCamera,
  onToggleFullscreen,
  onLeave,
  onRaiseHand,
  onReconnectLive,
  onShareResource,
}: UseVirtualClassroomUIParams) {
  const [activeTab, setActiveTab] = useState("participants");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false,
  );
  const [stageVolume, setStageVolume] = useState(1);
  const [isStageVideoPaused, setIsStageVideoPaused] = useState(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [participantQuery, setParticipantQuery] = useState("");
  const [messageMode, setMessageMode] = useState<"public" | "question" | "private">("public");
  const [chatView, setChatView] = useState<"messages" | "tutor">("messages");
  const [privateTarget, setPrivateTarget] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [whiteboardExpanded, setWhiteboardExpanded] = useState(false);
  const featuredVideoRef = useRef<HTMLVideoElement | null>(null);

  const {
    settings: liveSettings,
    setVideoQuality,
    setLayoutMode,
    setFocusMode,
    toggleFocusMode,
    setSubtitleLanguage,
  } = useLiveSettings();

  const connectionNotice = useLiveConnectionNotice({
    liveRoom,
    videoQuality: liveSettings.videoQuality,
    cameraEnabled: isCameraEnabled,
  });

  const {
    isPiPActive,
    pipError,
    isSupported: pipSupported,
    togglePictureInPicture,
    clearPipError,
  } = usePictureInPicture(featuredVideoRef);

  const liveStartedAtMs = useMemo(() => {
    const parsed = course.liveStartedAt ? Date.parse(course.liveStartedAt) : NaN;
    return Number.isFinite(parsed) ? parsed : Date.now();
  }, [course.id, course.liveStartedAt]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncSidebar = (event?: MediaQueryListEvent) => {
      setIsSidebarOpen(event ? event.matches : media.matches);
    };
    syncSidebar();
    media.addEventListener("change", syncSidebar);
    return () => media.removeEventListener("change", syncSidebar);
  }, []);

  useEffect(() => {
    if (primaryVideoRef.current) {
      primaryVideoRef.current.volume = stageVolume;
      if (isStageVideoPaused) primaryVideoRef.current.pause();
      else primaryVideoRef.current.play().catch(() => undefined);
    }
    Object.values(videoRefs.current).forEach((video) => {
      if (!(video instanceof HTMLVideoElement)) return;
      video.volume = stageVolume;
      if (isStageVideoPaused) video.pause();
      else video.play().catch(() => undefined);
    });
  }, [stageVolume, isStageVideoPaused, primaryVideoRef, videoRefs, participants.length]);

  useEffect(() => {
    if (!liveSettings.focusMode) return;
    if (activeTab === "chat" || activeTab === "participants" || activeTab === "attendance") {
      setActiveTab("whiteboard");
    }
  }, [liveSettings.focusMode, activeTab]);

  useEffect(() => {
    if (activeTab === "whiteboard" && whiteboardExpanded) {
      setIsSidebarOpen(false);
    }
  }, [activeTab, whiteboardExpanded]);

  const visibleSidebarTabs = useMemo(
    () => (liveSettings.focusMode ? liveSidebarTabs.filter((tab) => tab.id === "whiteboard") : liveSidebarTabs),
    [liveSettings.focusMode],
  );

  const openPanelTab = useCallback(
    (tabId: string) => {
      if (liveSettings.focusMode && tabId !== "whiteboard") return;
      setIsSidebarOpen(true);
      setActiveTab(tabId);
    },
    [liveSettings.focusMode],
  );

  const togglePanelTab = useCallback(
    (tabId: string) => {
      if (liveSettings.focusMode && tabId !== "whiteboard") return;
      if (isSidebarOpen && activeTab === tabId) {
        setIsSidebarOpen(false);
        return;
      }
      openPanelTab(tabId);
    },
    [liveSettings.focusMode, isSidebarOpen, activeTab, openPanelTab],
  );

  const cyclePanelTab = useCallback(
    (delta: number) => {
      const ids = visibleSidebarTabs.map((tab) => tab.id);
      const currentIndex = Math.max(0, ids.indexOf(activeTab));
      const nextId = ids[(currentIndex + delta + ids.length) % ids.length];
      openPanelTab(nextId);
    },
    [visibleSidebarTabs, activeTab, openPanelTab],
  );

  useTvNavigation(controlsRef, true);
  useTvNavigation(sidebarRef, isSidebarOpen);

  const exitLiveSession = useCallback(() => {
    onLeave?.();
  }, [onLeave]);

  useKeyboardShortcuts([
    { key: "f", handler: () => onToggleFullscreen() },
    { key: "m", handler: () => onToggleMic() },
    { key: "v", handler: () => onToggleCamera() },
    { key: "h", handler: () => onRaiseHand() },
    {
      key: "p",
      handler: () => {
        void togglePictureInPicture();
      },
    },
    { key: "t", handler: () => togglePanelTab("chat") },
    { key: " ", handler: () => setIsStageVideoPaused((value) => !value) },
    {
      key: "l",
      handler: () => {
        if (onBack) onBack();
        else exitLiveSession();
      },
    },
    { key: "r", when: () => Boolean(onReconnectLive), handler: () => onReconnectLive?.() },
    {
      key: "ArrowUp",
      handler: () => setStageVolume((value) => Math.min(1, Number((value + 0.1).toFixed(2)))),
    },
    {
      key: "ArrowDown",
      handler: () => setStageVolume((value) => Math.max(0, Number((value - 0.1).toFixed(2)))),
    },
    { key: "ArrowLeft", handler: () => cyclePanelTab(-1) },
    { key: "ArrowRight", handler: () => cyclePanelTab(1) },
    {
      key: "Escape",
      handler: () => {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        if (isSidebarOpen && typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
          setIsSidebarOpen(false);
          return;
        }
        if (isSidebarOpen && liveSettings.focusMode) {
          setIsSidebarOpen(false);
          return;
        }
        if (isFullscreen) {
          onToggleFullscreen();
          return;
        }
        if (onBack) onBack();
      },
    },
  ]);

  useEffect(() => {
    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - liveStartedAtMs) / 1000)));
    };
    updateElapsed();
    const timer = window.setInterval(() => {
      updateElapsed();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [liveStartedAtMs]);

  const canModerate = mode === "teacher" && currentUserRole !== "STUDENT";
  const connectedParticipants =
    participants.length > 0
      ? participants
      : [
          {
            identity: "connecting",
            name: "Connexion LiveKit",
            initials: "LK",
            isLocal: true,
            role: currentUserRole,
            connectionQuality: "stable",
          },
        ];

  const activeSpeaker =
    connectedParticipants.find((participant) => participant.identity === activeSpeakerIdentity) ||
    connectedParticipants.find((participant) => !participant.isLocal && participant.videoTrack) ||
    connectedParticipants.find((participant) => participant.videoTrack) ||
    connectedParticipants[0];

  const stageParticipants = resolveStageParticipants(
    connectedParticipants,
    liveSettings.layoutMode,
    activeSpeaker,
    mode,
  );

  const featuredLayout =
    liveSettings.layoutMode !== "tile" && stageParticipants.some((participant) => participant.videoTrack);
  const videoGridClass = stageGridClass(stageParticipants.length, featuredLayout);

  const registerParticipantVideoRef = useCallback(
    (identity: string, element: HTMLVideoElement | null) => {
      videoRefs.current[identity] = element;
      const firstIdentity = stageParticipants[0]?.identity;
      if (identity === firstIdentity) {
        featuredVideoRef.current = element;
        primaryVideoRef.current = element;
      }
    },
    [videoRefs, primaryVideoRef, stageParticipants],
  );

  const raisedHandParticipants = connectedParticipants.filter((participant) => participant.handRaised);
  const filteredParticipants = connectedParticipants.filter(
    (participant) =>
      participant.name.toLowerCase().includes(participantQuery.toLowerCase()) ||
      liveRoleLabel(participant.role).toLowerCase().includes(participantQuery.toLowerCase()),
  );
  const localReaction = connectedParticipants.find((participant) => participant.isLocal)?.reaction || null;
  const raisedHands = connectedParticipants.filter((participant) => participant.handRaised).length;
  const questionsCount = chatMessages.filter((m) => m.text.toLowerCase().includes("[question]")).length;
  const averageQuality = connectedParticipants.some((participant) =>
    String(participant.connectionQuality || "")
      .toLowerCase()
      .includes("poor"),
  )
    ? "À surveiller"
    : "Excellente";
  const attendanceRows = ((attendanceReport as { attendances?: AttendanceRow[] } | null)?.attendances ||
    []) as AttendanceRow[];

  const shareResource = useCallback(() => {
    if (!resourceTitle.trim() && !resourceUrl.trim()) return;
    onShareResource(resourceTitle.trim(), resourceUrl.trim());
    setResourceTitle("");
    setResourceUrl("");
  }, [resourceTitle, resourceUrl, onShareResource]);

  return {
    activeTab,
    setActiveTab,
    isSidebarOpen,
    setIsSidebarOpen,
    controlsRef,
    sidebarRef,
    participantQuery,
    setParticipantQuery,
    messageMode,
    setMessageMode,
    chatView,
    setChatView,
    privateTarget,
    setPrivateTarget,
    resourceTitle,
    setResourceTitle,
    resourceUrl,
    setResourceUrl,
    elapsedSeconds,
    isSettingsOpen,
    setIsSettingsOpen,
    whiteboardExpanded,
    setWhiteboardExpanded,
    liveSettings,
    setVideoQuality,
    setLayoutMode,
    setFocusMode,
    toggleFocusMode,
    setSubtitleLanguage,
    connectionNotice,
    isPiPActive,
    pipError,
    pipSupported,
    togglePictureInPicture,
    clearPipError,
    visibleSidebarTabs,
    openPanelTab,
    exitLiveSession,
    canModerate,
    connectedParticipants,
    activeSpeaker,
    stageParticipants,
    featuredLayout,
    videoGridClass,
    registerParticipantVideoRef,
    raisedHandParticipants,
    filteredParticipants,
    localReaction,
    raisedHands,
    questionsCount,
    averageQuality,
    attendanceRows,
    shareResource,
  };
}
