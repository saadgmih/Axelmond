import React, { useEffect, useMemo, useRef, useState } from "react";
import { Room } from "livekit-client";
import {
  Activity,
  BookOpen,
  Braces,
  CameraOff,
  CheckCircle,
  ChevronLeft,
  CircleDot,
  CircleStop,
  ClipboardList,
  Download,
  FileText,
  FileUp,
  Focus,
  Fullscreen,
  Hand,
  Link,
  MessageSquare,
  Mic,
  MicOff,
  MoreVertical,
  Paperclip,
  PenTool,
  PictureInPicture2,
  PieChart,
  Presentation,
  Radio,
  ScreenShare,
  ScreenShareOff,
  Search,
  Send,
  Settings,
  Sparkles,
  Shapes,
  Shield,
  Sigma,
  Timer,
  UserCheck,
  UserX,
  Users,
  Video,
  VideoOff,
  VolumeX,
  Wifi
} from "lucide-react";
import { Course } from "../types";
import { LiveChatMessage } from "../livekit";
import AITutorChat from "./AITutorChat";
import LiveSettingsPanel from "./live/LiveSettingsPanel";
import LiveMediaControl from "./live/LiveMediaControl";
import LiveParticipantTile from "./live/LiveParticipantTile";
import LivePollPanel from "./live/LivePollPanel";
import LiveReactionBar from "./live/LiveReactionBar";
import LiveConnectionNotice from "./live/LiveConnectionNotice";
import LiveResourceStage from "./live/LiveResourceStage";
import LiveWhiteboardPanel from "./live/LiveWhiteboardPanel";
import { resolveStageParticipants, stageGridClass } from "./live/live-stage";
import type { LivePollState, LiveSharedResource, LiveWhiteboardStroke } from "../live/live-sync";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useLiveConnectionNotice } from "../hooks/useLiveConnectionNotice";
import { useLiveSettings } from "../hooks/useLiveSettings";
import { usePictureInPicture } from "../hooks/usePictureInPicture";
import { useTvNavigation } from "../hooks/useTvNavigation";
import { type LiveLayoutMode } from "../live/liveSettings";

export interface LiveParticipantCard {
  identity: string;
  name: string;
  initials: string;
  role?: string;
  isLocal: boolean;
  isSpeaking?: boolean;
  handRaised?: boolean;
  reaction?: string;
  connectionQuality?: string;
  joinedAtLabel?: string;
  durationLabel?: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
  avatarUrl?: string | null;
  audioTrackSid?: string | null;
  videoTrackSid?: string | null;
  videoTrack?: any;
  audioTrack?: any;
}

export interface VirtualClassroomProps {
  mode: "student" | "teacher";
  course: Course;
  currentUserRole: string;
  liveRoom: Room | null;
  participants: LiveParticipantCard[];
  chatMessages: LiveChatMessage[];
  chatDraft: string;
  setChatDraft: (value: string) => void;
  statusMessage: string;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenShareEnabled: boolean;
  isFullscreen: boolean;
  isRecording: boolean;
  micError?: string | null;
  activeSpeakerIdentity: string;
  attendanceReport: any | null;
  primaryVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  videoRefs: React.MutableRefObject<Record<string, HTMLVideoElement | null>>;
  stageRef: React.MutableRefObject<HTMLDivElement | null>;
  onBack?: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleFullscreen: () => void;
  onLeave?: () => void;
  onSendMessage: (e: React.FormEvent) => void;
  onRaiseHand: () => void;
  onReaction: (reaction: string) => void;
  onRecordToggle: () => void;
  onModerateParticipant: (action: string, participant: LiveParticipantCard) => void;
  onLiveEvent: (action: string, details?: Record<string, unknown>) => void;
  onReconnectLive?: () => void;
  livePoll: LivePollState;
  myPollVote: string | null;
  onPublishPoll: () => void;
  onEndPoll: () => void;
  onVotePoll: (option: string) => void;
  onPollQuestionChange: (value: string) => void;
  whiteboardStrokes: LiveWhiteboardStroke[];
  localIdentity: string;
  onWhiteboardStroke: (stroke: LiveWhiteboardStroke) => void;
  onWhiteboardClear: () => void;
  sharedResource: LiveSharedResource | null;
  onShareResource: (title: string, url: string) => void;
  onDismissResource: () => void;
}

const sidebarTabs = [
  { id: "participants", label: "Participants", icon: Users },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "whiteboard", label: "Tableau blanc", icon: PenTool },
  { id: "tools", label: "Outils", icon: PieChart },
  { id: "attendance", label: "Présence", icon: ClipboardList },
];

function formatDuration(seconds: number) {
  const safe = Math.max(0, seconds || 0);
  const minutes = Math.floor(safe / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours > 0) return `${hours}h ${String(rest).padStart(2, "0")}m`;
  return `${rest}m ${String(safe % 60).padStart(2, "0")}s`;
}

function formatLiveStat(count: number, singular: string, plural: string) {
  return `${count} ${count <= 1 ? singular : plural}`;
}

function roleLabel(role?: string) {
  if (role === "ADMIN") return "Administrateur";
  if (role === "RESEARCHER") return "Chercheur";
  if (role === "PROFESSOR") return "Professeur";
  return "Étudiant";
}

function qualityLabel(value?: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("excellent")) return "Excellente";
  if (normalized.includes("good")) return "Bonne";
  if (normalized.includes("poor")) return "Faible";
  if (normalized.includes("lost")) return "Perdue";
  return "Stable";
}

export default function VirtualClassroom({
  mode,
  course,
  currentUserRole,
  liveRoom,
  participants,
  chatMessages,
  chatDraft,
  setChatDraft,
  statusMessage,
  isMicEnabled,
  isCameraEnabled,
  isScreenShareEnabled,
  isFullscreen,
  isRecording,
  micError,
  activeSpeakerIdentity,
  attendanceReport,
  primaryVideoRef,
  videoRefs,
  stageRef,
  onBack,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleFullscreen,
  onLeave,
  onSendMessage,
  onRaiseHand,
  onReaction,
  onRecordToggle,
  onModerateParticipant,
  onLiveEvent,
  onReconnectLive,
  livePoll,
  myPollVote,
  onPublishPoll,
  onEndPoll,
  onVotePoll,
  onPollQuestionChange,
  whiteboardStrokes,
  localIdentity,
  onWhiteboardStroke,
  onWhiteboardClear,
  sharedResource,
  onShareResource,
  onDismissResource,
}: VirtualClassroomProps) {
  const [activeTab, setActiveTab] = useState("participants");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false
  );
  const [stageVolume, setStageVolume] = useState(1);
  const [isStageVideoPaused, setIsStageVideoPaused] = useState(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [participantQuery, setParticipantQuery] = useState("");
  const [messageMode, setMessageMode] = useState<"public" | "question" | "private">("public");
  const [chatView, setChatView] = useState<"messages" | "tutor">("messages");
  const [privateTarget, setPrivateTarget] = useState("");
  const [latexDraft, setLatexDraft] = useState("\\int_a^b f(x)\\,dx = F(b)-F(a)");
  const [codeDraft, setCodeDraft] = useState("def recherche_binaire(tableau, cible):\n    gauche, droite = 0, len(tableau) - 1\n    while gauche <= droite:\n        milieu = (gauche + droite) // 2\n        if tableau[milieu] == cible:\n            return milieu\n        if tableau[milieu] < cible:\n            gauche = milieu + 1\n        else:\n            droite = milieu - 1\n    return -1");
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
    () => (liveSettings.focusMode
      ? sidebarTabs.filter((tab) => tab.id === "whiteboard")
      : sidebarTabs),
    [liveSettings.focusMode],
  );

  const openPanelTab = (tabId: string) => {
    if (liveSettings.focusMode && tabId !== "whiteboard") return;
    setIsSidebarOpen(true);
    setActiveTab(tabId);
  };

  const togglePanelTab = (tabId: string) => {
    if (liveSettings.focusMode && tabId !== "whiteboard") return;
    if (isSidebarOpen && activeTab === tabId) {
      setIsSidebarOpen(false);
      return;
    }
    openPanelTab(tabId);
  };

  const cyclePanelTab = (delta: number) => {
    const ids = visibleSidebarTabs.map((tab) => tab.id);
    const currentIndex = Math.max(0, ids.indexOf(activeTab));
    const nextId = ids[(currentIndex + delta + ids.length) % ids.length];
    openPanelTab(nextId);
  };

  useTvNavigation(controlsRef, true);
  useTvNavigation(sidebarRef, isSidebarOpen);

  const exitLiveSession = () => {
    onLeave?.();
  };

  useKeyboardShortcuts([
    { key: "f", handler: () => onToggleFullscreen() },
    { key: "m", handler: () => onToggleMic() },
    { key: "v", handler: () => onToggleCamera() },
    { key: "h", handler: () => onRaiseHand() },
    { key: "p", handler: () => { void togglePictureInPicture(); } },
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
  const connectedParticipants = participants.length > 0 ? participants : [{
    identity: "connecting",
    name: "Connexion LiveKit",
    initials: "LK",
    isLocal: true,
    role: currentUserRole,
    connectionQuality: "stable",
  }];
  
  const activeSpeaker = connectedParticipants.find((participant) => participant.identity === activeSpeakerIdentity)
    || connectedParticipants.find((participant) => !participant.isLocal && participant.videoTrack)
    || connectedParticipants.find((participant) => participant.videoTrack)
    || connectedParticipants[0];
  const stageParticipants = resolveStageParticipants(
    connectedParticipants,
    liveSettings.layoutMode,
    activeSpeaker,
    mode,
  );
  const featuredLayout = liveSettings.layoutMode !== "tile" && stageParticipants.some((participant) => participant.videoTrack);
  const videoGridClass = stageGridClass(stageParticipants.length, featuredLayout);
  const raisedHandParticipants = connectedParticipants.filter((participant) => participant.handRaised);
  const filteredParticipants = connectedParticipants.filter((participant) =>
    participant.name.toLowerCase().includes(participantQuery.toLowerCase())
    || roleLabel(participant.role).toLowerCase().includes(participantQuery.toLowerCase())
  );
  const localReaction = connectedParticipants.find((participant) => participant.isLocal)?.reaction || null;

  const raisedHands = connectedParticipants.filter((participant) => participant.handRaised).length;
  const questionsCount = chatMessages.filter(m => m.text.toLowerCase().includes("[question]")).length;
  const averageQuality = connectedParticipants.some((participant) => String(participant.connectionQuality || "").toLowerCase().includes("poor"))
    ? "À surveiller"
    : "Excellente";
  const attendanceRows = attendanceReport?.attendances || [];

  const shareResource = () => {
    if (!resourceTitle.trim() && !resourceUrl.trim()) return;
    onShareResource(resourceTitle.trim(), resourceUrl.trim());
    setResourceTitle("");
    setResourceUrl("");
  };

  return (
    <div className="live-classroom-root w-full max-w-full h-full min-h-0 bg-zinc-950 text-white font-sans flex flex-col relative box-border flex-1 overflow-hidden">
      <span className="sr-only">Classe virtuelle sécurisée</span>
      <span className="sr-only">Tableau blanc collaboratif</span>
      <span className="sr-only">Rapport de présence</span>
      
      {pipError && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-amber-500/40 shadow-2xl rounded-xl p-4 flex items-center gap-4 max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-amber-500/20 p-2 rounded-full">
            <PictureInPicture2 className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-white mb-0.5">Picture-in-Picture</h4>
            <p className="text-[11px] text-zinc-300">{pipError}</p>
          </div>
          <button
            onClick={clearPipError}
            className="px-3 py-1.5 bg-white text-zinc-900 text-[11px] font-bold rounded-lg hover:bg-zinc-200 transition-colors shrink-0"
          >
            OK
          </button>
        </div>
      )}

      {liveSettings.focusMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-[11px] font-bold text-emerald-200 shadow-lg backdrop-blur-md">
          Mode concentration actif
        </div>
      )}

      {/* Toast Notification - Erreurs Micro */}
      {micError && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-red-500/50 shadow-2xl rounded-xl p-4 flex items-center gap-4 max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-red-500/20 p-2 rounded-full">
            <MicOff className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-white mb-0.5">Erreur Microphone</h4>
            <p className="text-[11px] text-zinc-300">{micError}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Si l'accès est refusé, utilisez l'icône cadenas de la barre d'adresse pour autoriser le micro.</p>
          </div>
          <button 
            onClick={onToggleMic} 
            className="px-3 py-1.5 bg-white text-zinc-900 text-[11px] font-bold rounded-lg hover:bg-zinc-200 transition-colors shrink-0"
          >
            Autoriser le micro
          </button>
        </div>
      )}

      {/* Header Institutionnel */}
      <header className="h-14 shrink-0 w-full max-w-full bg-zinc-900 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 z-40 box-border">
        <div className="flex items-center gap-4 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="touch-target p-2 -ml-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center"
              title="Retour au module"
              aria-label="Retour au module"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm lg:text-base font-bold truncate tracking-tight text-zinc-100">{course.title}</h1>
              {isRecording && (
                <span className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] uppercase font-black bg-red-500/10 text-red-400 border border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  REC
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate font-medium">
              Laboratoire : {course.liveSubject || "Session de recherche"} • Dr. {course.instructor}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {liveSettings.focusMode && (
            <button
              type="button"
              onClick={() => openPanelTab("whiteboard")}
              className="relative touch-target p-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border border-emerald-400/20 flex items-center gap-2 min-h-[44px]"
              title="Ouvrir le tableau blanc"
              aria-label="Ouvrir le tableau blanc"
            >
              <PenTool className="w-4 h-4 text-emerald-300" />
              <span className="text-xs font-bold text-emerald-100 hidden sm:block">Tableau blanc</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="touch-target p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors border border-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Paramètres Live"
            aria-label="Ouvrir les paramètres live"
          >
            <Settings className="w-4 h-4 text-zinc-200" />
          </button>
        </div>
      </header>

      {/* Main Container — hauteur figée ; le panneau latéral ne redimensionne jamais la scène vidéo */}
      <div
        className={`live-classroom-main flex flex-1 min-h-0 w-full max-w-full relative box-border overflow-hidden flex-col lg:grid lg:items-stretch ${
          isSidebarOpen ? "lg:grid-cols-[minmax(0,1fr)_420px]" : "lg:grid-cols-1"
        }`}
      >
        {!isSidebarOpen && (
          <button
            type="button"
            aria-label="Ouvrir le panneau interactif"
            className="lg:hidden fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-xl border border-white/10 border-r-0 bg-zinc-900/95 px-2 py-4 text-zinc-200 shadow-xl backdrop-blur-md"
            onClick={() => setIsSidebarOpen(true)}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        )}

        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Fermer le panneau interactif"
            className="absolute inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Center Stage - Video & Control */}
        <main 
          ref={stageRef}
          data-live-stage="main"
          className="live-classroom-stage flex flex-col min-w-0 min-h-0 h-full w-full relative bg-black box-border overflow-hidden"
        >
          {/* Barre de Statistiques Pédagogiques (Hybride Moodle/Blackboard) */}
          <div className="shrink-0 bg-zinc-900/95 border-b border-white/5 py-2 px-4 flex justify-between md:justify-center items-center gap-4 lg:gap-10 overflow-x-auto hide-scrollbar z-30">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Timer className="w-4 h-4 text-blue-400" />
              <span className="font-mono">{formatDuration(elapsedSeconds)}</span>
            </div>
            {!liveSettings.focusMode && (
              <>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold">{formatLiveStat(connectedParticipants.length, "connecté", "connectés")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Hand className="w-4 h-4 text-amber-400" />
                  <span className="font-bold">{formatLiveStat(raisedHands, "main levée", "mains levées")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300 hidden sm:flex">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold">{formatLiveStat(questionsCount, "question", "questions")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300 hidden lg:flex">
                  <Wifi className="w-4 h-4 text-zinc-400" />
                  <span className="font-medium text-zinc-400">{averageQuality}</span>
                </div>
              </>
            )}
          </div>

          {/* Control Bar — au-dessus de la vidéo */}
          <div
            ref={controlsRef}
            data-tv-zone="live-controls"
            className="shrink-0 min-h-[80px] w-full max-w-full bg-zinc-900 border-b border-white/5 flex items-stretch z-30 px-2 sm:px-3 box-border py-2 gap-2"
          >
            <div className="flex shrink-0 items-center gap-2 border-r border-white/10 pr-2 sm:pr-3">
              <LiveMediaControl
                label="Micro"
                enabledLabel="Activé"
                disabledLabel="Désactivé"
                enabled={isMicEnabled}
                enabledIcon={Mic}
                disabledIcon={MicOff}
                onClick={onToggleMic}
                ariaLabel={isMicEnabled ? "Couper le micro (M)" : "Activer le micro (M)"}
              />
              <LiveMediaControl
                label="Caméra"
                enabledLabel="Activée"
                disabledLabel="Désactivée"
                enabled={isCameraEnabled}
                enabledIcon={Video}
                disabledIcon={VideoOff}
                onClick={onToggleCamera}
                ariaLabel={isCameraEnabled ? "Couper la caméra (V)" : "Activer la caméra (V)"}
              />
            </div>

            <div className="flex min-w-0 flex-1 items-center overflow-x-auto hide-scrollbar gap-1.5 sm:gap-2">
              <div className="hidden lg:block shrink-0">
                <LiveReactionBar compact activeReaction={localReaction} onReaction={onReaction} />
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  data-tv-focusable
                  tabIndex={0}
                  onClick={onToggleScreenShare}
                  aria-label={isScreenShareEnabled ? "Arrêter le partage d'écran" : "Partager l'écran"}
                  aria-pressed={isScreenShareEnabled}
                  className={`kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl transition-all ${isScreenShareEnabled ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "hover:bg-zinc-800 text-zinc-300"}`}
                >
                  {isScreenShareEnabled ? <ScreenShareOff className="w-5 h-5 mb-1.5" /> : <ScreenShare className="w-5 h-5 mb-1.5" />}
                  <span className="text-[10px] font-bold">Partager</span>
                </button>
                <button
                  type="button"
                  data-tv-focusable
                  tabIndex={0}
                  onClick={onRaiseHand}
                  aria-label="Lever la main (H)"
                  className="kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl hover:bg-zinc-800 text-zinc-300 transition-all group"
                >
                  <Hand className="w-5 h-5 mb-1.5 group-hover:text-amber-400 transition-colors" />
                  <span className="text-[10px] font-bold">Main</span>
                </button>
                <button
                  type="button"
                  data-tv-focusable
                  tabIndex={0}
                  onClick={() => { void togglePictureInPicture(); }}
                  aria-label={isPiPActive ? "Quitter Picture-in-Picture (P)" : "Activer Picture-in-Picture (P)"}
                  aria-pressed={isPiPActive}
                  className={`kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl transition-all ${
                    isPiPActive ? "bg-indigo-500/10 border border-indigo-400/30 text-indigo-300" : "hover:bg-zinc-800 text-zinc-300"
                  }`}
                >
                  <PictureInPicture2 className="w-5 h-5 mb-1.5" />
                  <span className="text-[10px] font-bold">PiP</span>
                </button>
                <button
                  type="button"
                  data-tv-focusable
                  tabIndex={0}
                  onClick={toggleFocusMode}
                  aria-label="Mode concentration"
                  aria-pressed={liveSettings.focusMode}
                  className={`kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl transition-all hidden md:flex ${
                    liveSettings.focusMode ? "bg-emerald-500/10 border border-emerald-400/30 text-emerald-300" : "hover:bg-zinc-800 text-zinc-300"
                  }`}
                >
                  <Focus className="w-5 h-5 mb-1.5" />
                  <span className="text-[10px] font-bold">Focus</span>
                </button>
                <button
                  type="button"
                  data-tv-focusable
                  tabIndex={0}
                  onClick={onToggleFullscreen}
                  aria-label={isFullscreen ? "Quitter le plein écran (F)" : "Plein écran (F)"}
                  className="kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl hover:bg-zinc-800 text-zinc-300 transition-all hidden sm:flex"
                >
                  <Fullscreen className="w-5 h-5 mb-1.5" />
                  <span className="text-[10px] font-bold">Plein écran</span>
                </button>
              </div>

              {canModerate && (
                <div className="flex items-center gap-2 ml-1 sm:ml-2 pl-1 sm:pl-2 border-l border-white/10 shrink-0">
                  <button
                    type="button"
                    data-tv-focusable
                    tabIndex={0}
                    onClick={onRecordToggle}
                    aria-label={isRecording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
                    aria-pressed={isRecording}
                    className={`kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl transition-all ${isRecording ? "bg-red-500/10 border border-red-500/20 text-red-400" : "hover:bg-zinc-800 text-zinc-300"}`}
                  >
                    {isRecording ? <CircleStop className="w-5 h-5 mb-1.5" /> : <CircleDot className="w-5 h-5 mb-1.5" />}
                    <span className="text-[10px] font-bold">Rec</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center border-l border-white/10 pl-2 sm:pl-3">
              <button
                type="button"
                data-tv-focusable
                tabIndex={0}
                onClick={exitLiveSession}
                aria-label="Quitter la salle live (L)"
                className="kbd-nav-focus touch-target h-12 min-h-[48px] px-4 sm:px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all shadow-md flex items-center justify-center whitespace-nowrap"
              >
                Quitter
              </button>
            </div>
          </div>

          {/* Main Video Area */}
          <div className="live-classroom-video-shell flex-1 min-h-0 p-0 lg:p-4 flex flex-col relative min-w-0 bg-[#0a0a0a] overflow-hidden">
            <div
              data-live-video-stage
              className="live-classroom-video-stage flex-1 min-h-0 w-full h-full relative lg:rounded-2xl overflow-hidden bg-zinc-950 lg:border border-white/5 lg:shadow-2xl flex items-center justify-center box-border"
            >
              {connectionNotice && !whiteboardExpanded && (
                <LiveConnectionNotice
                  message={connectionNotice.message}
                  variant={connectionNotice.variant}
                />
              )}
              {whiteboardExpanded ? (
                <div className="h-full w-full p-3">
                  <LiveWhiteboardPanel
                    expanded
                    onToggleExpanded={() => setWhiteboardExpanded(false)}
                    canModerate={canModerate}
                    strokes={whiteboardStrokes}
                    localIdentity={localIdentity}
                    onStrokeComplete={onWhiteboardStroke}
                    onClear={onWhiteboardClear}
                  />
                </div>
              ) : (
                <>
                  <div className={`live-video-grid grid ${videoGridClass} gap-3 w-full h-full p-3 ${stageParticipants.length === 1 ? "grid-rows-1" : ""}`}>
                    {stageParticipants.map((participant, index) => {
                      const isActive = participant.identity === activeSpeaker?.identity || participant.isSpeaking;
                      const isFeatured = featuredLayout && index === 0;
                      const isSolo = stageParticipants.length === 1;
                      return (
                        <LiveParticipantTile
                          key={participant.identity}
                          participant={participant}
                          isActive={Boolean(isActive)}
                          isFeatured={isFeatured}
                          isSolo={isSolo}
                          roleLabel={roleLabel}
                          videoRef={(element) => {
                            videoRefs.current[participant.identity] = element;
                            if (index === 0) featuredVideoRef.current = element;
                            if (index === 0) primaryVideoRef.current = element;
                          }}
                        />
                      );
                    })}
                  </div>
                  {sharedResource && (
                    <LiveResourceStage
                      resource={sharedResource}
                      canModerate={canModerate}
                      onDismiss={onDismissResource}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Onglets Académiques */}
        <aside 
          ref={sidebarRef}
          data-tv-zone="live-sidebar"
          data-live-sidebar
          className={`live-classroom-sidebar absolute lg:static right-0 top-0 bottom-0 w-[min(100vw,420px)] lg:w-[420px] max-w-full lg:min-w-[420px] shrink-0 bg-zinc-900 border-l border-white/5 flex flex-col min-h-0 h-full max-h-full overflow-hidden transition-transform duration-300 ease-out z-40 box-border shadow-2xl lg:shadow-none ${isSidebarOpen ? "translate-x-0 lg:flex" : "translate-x-full lg:hidden"}`}
        >
          {/* Sidebar Tabs */}
          <div className={`px-3 pt-4 pb-2 grid gap-1 shrink-0 border-b border-white/5 bg-zinc-900/50 ${
            visibleSidebarTabs.length <= 2 ? "grid-cols-2" : visibleSidebarTabs.length === 3 ? "grid-cols-3" : "grid-cols-5"
          }`}>
            {visibleSidebarTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-tv-focusable
                tabIndex={0}
                onClick={() => setActiveTab(tab.id)}
                aria-label={`Onglet ${tab.label}`}
                aria-selected={activeTab === tab.id}
                className={`kbd-nav-focus flex flex-col items-center justify-center py-2 rounded-lg transition-all min-h-[52px] ${
                  activeTab === tab.id 
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner" 
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                <tab.icon className="w-4 h-4 mb-1" />
                <span className="text-[9px] font-bold text-center leading-tight px-1">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Sidebar Content — scroll interne uniquement */}
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden p-3 sm:p-4 bg-zinc-950/30">
            <div
              className={`flex-1 min-h-0 ${
                activeTab === "chat"
                  ? "flex flex-col overflow-hidden"
                  : "overflow-y-auto custom-scrollbar"
              }`}
            >
            
            {activeTab === "participants" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {raisedHandParticipants.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-300">Mains levées</p>
                    <div className="space-y-2">
                      {raisedHandParticipants.map((participant) => (
                        <div key={participant.identity} className="flex items-center gap-2 text-xs font-semibold text-amber-100">
                          <Hand className="h-4 w-4" />
                          <span>{participant.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    value={participantQuery} 
                    onChange={(event) => setParticipantQuery(event.target.value)} 
                    placeholder="Rechercher un participant..." 
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors" 
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Membres de la session
                    </p>
                    <span className="text-xs font-mono text-zinc-400">{filteredParticipants.length}</span>
                  </div>
                  {filteredParticipants.map((participant) => (
                    <div key={participant.identity} className="group relative rounded-xl hover:bg-zinc-800/50 p-2.5 flex items-center justify-between transition-colors border border-transparent hover:border-white/5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-xs font-bold shrink-0">
                          {participant.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{participant.name}</p>
                          <p className="text-[10px] text-zinc-500 truncate font-medium">{roleLabel(participant.role)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {participant.handRaised && <Hand className="w-3.5 h-3.5 text-amber-400" />}
                        {participant.hasAudio ? <Mic className="w-3.5 h-3.5 text-zinc-500" /> : <MicOff className="w-3.5 h-3.5 text-red-400/70" />}
                        {participant.hasVideo ? <Video className="w-3.5 h-3.5 text-zinc-500" /> : <VideoOff className="w-3.5 h-3.5 text-zinc-600" />}
                      </div>

                      {/* Moderation Hover Menu */}
                      {canModerate && !participant.isLocal && (
                        <div className="absolute right-2 opacity-0 group-hover:opacity-100 bg-zinc-800 p-1 rounded-lg flex items-center gap-1 shadow-xl border border-white/10 transition-opacity">
                          <button onClick={() => onModerateParticipant("MUTE_AUDIO", participant)} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-300" title="Couper le micro">
                            <VolumeX className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onModerateParticipant("MUTE_VIDEO", participant)} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-300" title="Couper la caméra">
                            <CameraOff className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onModerateParticipant("REMOVE_PARTICIPANT", participant)} className="p-1.5 hover:bg-red-500/20 rounded text-red-400" title="Expulser">
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="flex flex-1 min-h-0 flex-col animate-in fade-in duration-300">
                <div className="mb-3 grid grid-cols-2 gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setChatView("messages")}
                    aria-pressed={chatView === "messages"}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                      chatView === "messages"
                        ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-200"
                        : "border-white/10 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Messages live
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatView("tutor")}
                    aria-pressed={chatView === "tutor"}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      chatView === "tutor"
                        ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-200"
                        : "border-white/10 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    Tuteur IA
                  </button>
                </div>

                {chatView === "tutor" ? (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <AITutorChat
                      courseId={course.id}
                      courseTitle={course.title}
                      moduleTitle={course.liveSubject || "Session live"}
                      variant="live"
                      className="min-h-0 flex-1 w-full"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex bg-zinc-900 rounded-lg p-1 mb-4 border border-white/5 shrink-0">
                  {(["public", "question", "private"] as const).map((item) => (
                    <button 
                      key={item} 
                      onClick={() => setMessageMode(item)} 
                      className={`flex-1 rounded-md py-1.5 text-[10px] font-bold uppercase transition-colors ${
                        messageMode === item ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {item === "question" ? "Q&A" : item}
                    </button>
                  ))}
                </div>
                
                {messageMode === "private" && (
                  <select 
                    value={privateTarget} 
                    onChange={(event) => setPrivateTarget(event.target.value)} 
                    className="w-full bg-zinc-900 border border-white/5 rounded-lg px-3 py-2 text-xs text-white mb-4 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Sélectionner un destinataire...</option>
                    {connectedParticipants.filter((p) => !p.isLocal).map((p) => (
                      <option key={p.identity} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                      <MessageSquare className="w-8 h-8 text-zinc-600" />
                      <p className="text-xs text-zinc-400">Le chat académique est ouvert.</p>
                    </div>
                  ) : (
                    chatMessages.map((message) => (
                      <div key={message.id} className={`flex flex-col ${message.isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-baseline gap-2 mb-1 mx-1">
                          <span className="text-[10px] font-bold text-zinc-400">{message.sender}</span>
                          <span className="text-[9px] text-zinc-600 font-mono">{message.time}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                          message.isMe 
                            ? 'bg-indigo-600 text-white rounded-tr-sm' 
                            : 'bg-zinc-800 text-zinc-100 rounded-tl-sm border border-white/5'
                        }`}>
                          {message.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="shrink-0 mt-4 space-y-3">
                  <form onSubmit={onSendMessage} className="relative">
                    <button 
                      type="button" 
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white transition-colors"
                      title="Joindre un fichier"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <input
                      value={chatDraft}
                      onChange={(event) => setChatDraft(event.target.value)}
                      placeholder="Tapez votre message..."
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-12 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                    />
                    <button 
                      type="submit" 
                      disabled={!chatDraft.trim()} 
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 touch-target p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-transparent disabled:text-zinc-600 text-white rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "whiteboard" && !whiteboardExpanded && (
              <LiveWhiteboardPanel
                expanded={false}
                onToggleExpanded={() => {
                  setWhiteboardExpanded(true);
                  setIsSidebarOpen(false);
                }}
                canModerate={canModerate}
                strokes={whiteboardStrokes}
                localIdentity={localIdentity}
                onStrokeComplete={onWhiteboardStroke}
                onClear={onWhiteboardClear}
              />
            )}

            {activeTab === "tools" && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <LivePollPanel
                  canModerate={canModerate}
                  pollQuestion={livePoll.question}
                  pollOptions={livePoll.options}
                  pollVotes={livePoll.votes}
                  pollActive={livePoll.active}
                  myVote={myPollVote}
                  onQuestionChange={onPollQuestionChange}
                  onPublishPoll={onPublishPoll}
                  onEndPoll={onEndPoll}
                  onVote={onVotePoll}
                />
                <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Partager une ressource</p>
                  <input
                    value={resourceTitle}
                    onChange={(event) => setResourceTitle(event.target.value)}
                    placeholder="Titre (PDF, slides, lien...)"
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white"
                  />
                  <input
                    value={resourceUrl}
                    onChange={(event) => setResourceUrl(event.target.value)}
                    placeholder="URL du document ou de la présentation"
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={shareResource}
                    className="w-full rounded-xl border border-indigo-400/30 bg-indigo-500/10 py-2.5 text-xs font-bold text-indigo-200"
                  >
                    <FileUp className="mr-2 inline h-4 w-4" />
                    Partager au module
                  </button>
                </div>
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 shadow-sm text-center">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Actifs</p>
                    <p className="text-3xl font-black text-emerald-400">{attendanceReport?.summary?.online ?? connectedParticipants.length}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 shadow-sm text-center">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Durée Moy.</p>
                    <p className="text-2xl font-bold text-blue-400 mt-2 font-mono">{formatDuration(attendanceReport?.summary?.averageDurationSeconds || elapsedSeconds)}</p>
                  </div>
                </div>

                <div className="bg-zinc-900 rounded-xl border border-white/5 overflow-hidden shadow-sm">
                  <div className="flex justify-between px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase bg-zinc-950/50 border-b border-white/5">
                    <span>Identité</span>
                    <span>Durée</span>
                  </div>
                  <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {(attendanceRows.length ? attendanceRows : connectedParticipants).map((row: any) => (
                      <div key={row.id || row.identity} className="flex justify-between items-center px-4 py-3 hover:bg-zinc-800/50 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-zinc-200">{row.name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium">{roleLabel(row.role)}</p>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">
                          {formatDuration(row.durationSeconds || elapsedSeconds)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => onLiveEvent("QUESTION", { type: "attendance_export_requested" })} className="w-full mt-2 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-2 border border-white/5 shadow-sm">
                  <Download className="w-4 h-4" /> Exporter le rapport (CSV)
                </button>
              </div>
            )}

            </div>
          </div>
        </aside>

      </div>

      <LiveSettingsPanel
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={liveSettings}
        onVideoQualityChange={setVideoQuality}
        onLayoutModeChange={setLayoutMode}
        onFocusModeChange={setFocusMode}
        onSubtitleLanguageChange={setSubtitleLanguage}
        pipSupported={pipSupported}
        isPiPActive={isPiPActive}
        onTogglePiP={() => { void togglePictureInPicture(); }}
      />
    </div>
  );
}
