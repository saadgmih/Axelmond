import React, { useEffect, useMemo, useRef, useState } from "react";
import { Room } from "livekit-client";
import {
  Activity,
  BookOpen,
  Braces,
  CameraOff,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CircleStop,
  ClipboardList,
  Crown,
  Download,
  FileText,
  FileUp,
  Fullscreen,
  Hand,
  Link,
  MessageSquare,
  Mic,
  MicOff,
  MoreVertical,
  Paperclip,
  PenTool,
  PieChart,
  Presentation,
  Radio,
  ScreenShare,
  ScreenShareOff,
  Search,
  Send,
  Settings,
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
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useTvNavigation } from "../hooks/useTvNavigation";

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
  onLeave: () => void;
  onSendMessage: (e: React.FormEvent) => void;
  onRaiseHand: () => void;
  onReaction: (reaction: string) => void;
  onRecordToggle: () => void;
  onModerateParticipant: (action: string, participant: LiveParticipantCard) => void;
  onLiveEvent: (action: string, details?: Record<string, unknown>) => void;
  onReconnectLive?: () => void;
}

const tabs = [
  { id: "participants", label: "Participants", icon: Users },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "whiteboard", label: "Tableau blanc", icon: PenTool },
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
  const [privateTarget, setPrivateTarget] = useState("");
  const [latexDraft, setLatexDraft] = useState("\\int_a^b f(x)\\,dx = F(b)-F(a)");
  const [codeDraft, setCodeDraft] = useState("def recherche_binaire(tableau, cible):\n    gauche, droite = 0, len(tableau) - 1\n    while gauche <= droite:\n        milieu = (gauche + droite) // 2\n        if tableau[milieu] == cible:\n            return milieu\n        if tableau[milieu] < cible:\n            gauche = milieu + 1\n        else:\n            droite = milieu - 1\n    return -1");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [pollQuestion, setPollQuestion] = useState("Comprenez-vous la notion de base abordée ?");
  const [pollOptions, setPollOptions] = useState(["Oui, c'est très clair", "J'ai besoin de plus d'exemples", "Non, je suis perdu"]);
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const liveStartedAtMs = useMemo(() => {
    const parsed = course.liveStartedAt ? Date.parse(course.liveStartedAt) : NaN;
    return Number.isFinite(parsed) ? parsed : Date.now();
  }, [course.id, course.liveStartedAt]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const whiteboardContainerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);

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

  const openPanelTab = (tabId: string) => {
    setIsSidebarOpen(true);
    setActiveTab(tabId);
  };

  const togglePanelTab = (tabId: string) => {
    if (isSidebarOpen && activeTab === tabId) {
      setIsSidebarOpen(false);
      return;
    }
    openPanelTab(tabId);
  };

  const cyclePanelTab = (delta: number) => {
    const ids = tabs.map((tab) => tab.id);
    const currentIndex = Math.max(0, ids.indexOf(activeTab));
    const nextId = ids[(currentIndex + delta + ids.length) % ids.length];
    openPanelTab(nextId);
  };

  useTvNavigation(controlsRef, true);
  useTvNavigation(sidebarRef, isSidebarOpen);

  useKeyboardShortcuts([
    { key: "f", handler: () => onToggleFullscreen() },
    { key: "m", handler: () => onToggleMic() },
    { key: " ", handler: () => setIsStageVideoPaused((value) => !value) },
    { key: "c", handler: () => togglePanelTab("chat") },
    { key: "p", handler: () => togglePanelTab("participants") },
    {
      key: "l",
      handler: () => {
        if (onBack) onBack();
        else onLeave();
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
        if (isSidebarOpen && typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
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
    if (activeTab !== "whiteboard") return;
    const container = whiteboardContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);
    return () => observer.disconnect();
  }, [activeTab]);

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
  const videoParticipants = connectedParticipants.filter((participant) => participant.videoTrack);
  const videoGridClass = videoParticipants.length <= 1
    ? "grid-cols-1"
    : videoParticipants.length === 2
      ? "grid-cols-1 lg:grid-cols-2"
      : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  const filteredParticipants = connectedParticipants.filter((participant) =>
    participant.name.toLowerCase().includes(participantQuery.toLowerCase())
    || roleLabel(participant.role).toLowerCase().includes(participantQuery.toLowerCase())
  );
  
  const raisedHands = connectedParticipants.filter((participant) => participant.handRaised).length;
  const questionsCount = chatMessages.filter(m => m.text.toLowerCase().includes("[question]")).length;
  const averageQuality = connectedParticipants.some((participant) => String(participant.connectionQuality || "").toLowerCase().includes("poor"))
    ? "À surveiller"
    : "Excellente";
  const attendanceRows = attendanceReport?.attendances || [];

  const getCoordinates = (event: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = (event as React.PointerEvent).clientX;
      clientY = (event as React.PointerEvent).clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    
    // Prevent default scrolling for touch
    if ('touches' in event && event.cancelable) {
      // event.preventDefault() cannot be called directly on React synthetic passive events easily, 
      // but we use CSS touch-none to handle this.
    }

    const { x, y } = getCoordinates(event, canvas);
    
    isDrawingRef.current = true;
    context.strokeStyle = "#8b5cf6"; // Violet pro
    context.lineWidth = 3;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    
    const { x, y } = getCoordinates(event, canvas);
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (isDrawingRef.current) {
      onLiveEvent("WHITEBOARD_UPDATE", { tool: "freehand" });
    }
    isDrawingRef.current = false;
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    onLiveEvent("WHITEBOARD_UPDATE", { tool: "clear" });
  };

  const shareResource = () => {
    if (!resourceTitle.trim() && !resourceUrl.trim()) return;
    onLiveEvent("RESOURCE_SHARE", { title: resourceTitle.trim(), url: resourceUrl.trim() });
    setResourceTitle("");
    setResourceUrl("");
  };

  const votePoll = (option: string) => {
    setPollVotes((prev) => ({ ...prev, [option]: (prev[option] || 0) + 1 }));
    onLiveEvent("QUESTION", { type: "poll_vote", question: pollQuestion, option });
  };

  const totalVotes = useMemo(() => Object.values(pollVotes).reduce<number>((sum, value) => sum + Number(value || 0), 0), [pollVotes]);

  return (
    <div className="w-full max-w-full bg-zinc-950 text-white font-sans flex flex-col relative box-border min-h-[560px] overflow-x-hidden">
      <span className="sr-only">Classe virtuelle sécurisée</span>
      <span className="sr-only">Tableau blanc collaboratif</span>
      <span className="sr-only">Rapport de présence</span>
      
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
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="relative touch-target p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors border border-white/5 flex items-center gap-2 min-h-[44px]"
            title="Ouvrir/Fermer le panneau académique"
            aria-label="Ouvrir ou fermer le panneau interactif"
          >
            <span className="text-xs font-bold text-zinc-300 hidden sm:block">Panneau interactif</span>
            {isSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
            {!isSidebarOpen && raisedHands > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-zinc-900"></span>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 flex-col lg:flex-row w-full max-w-full relative box-border min-h-[480px]">
        
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
          className="flex flex-1 flex flex-col min-w-0 w-full relative bg-black box-border min-h-[360px]"
        >
          {/* Barre de Statistiques Pédagogiques (Hybride Moodle/Blackboard) */}
          <div className="shrink-0 bg-zinc-900/95 border-b border-white/5 py-2 px-4 flex justify-between md:justify-center items-center gap-4 lg:gap-10 overflow-x-auto hide-scrollbar z-30">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Timer className="w-4 h-4 text-blue-400" />
              <span className="font-mono">{formatDuration(elapsedSeconds)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">{connectedParticipants.length} connectés</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Hand className="w-4 h-4 text-amber-400" />
              <span className="font-bold">{raisedHands} levées</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-300 hidden sm:flex">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span className="font-bold">{questionsCount} questions</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-300 hidden lg:flex">
              <Wifi className="w-4 h-4 text-zinc-400" />
              <span className="font-medium text-zinc-400">{averageQuality}</span>
            </div>
          </div>

          {/* Main Video Area */}
          <div className="flex-1 min-h-[220px] sm:min-h-[280px] lg:min-h-[340px] p-0 lg:p-4 flex items-center justify-center relative min-w-0 bg-[#0a0a0a]">
            <div className="w-full h-full min-h-[200px] max-h-[min(72dvh,780px)] relative lg:rounded-2xl overflow-hidden bg-zinc-950 lg:border border-white/5 lg:shadow-2xl flex items-center justify-center box-border">
              
              {videoParticipants.length > 0 ? (
                <div className={`live-video-grid grid ${videoGridClass} gap-3 w-full h-full p-3`}>
                  {videoParticipants.map((participant) => {
                    const isActive = participant.identity === activeSpeaker?.identity || participant.isSpeaking;
                    return (
                      <div
                        key={participant.identity}
                        className={`relative min-h-0 rounded-xl overflow-hidden bg-zinc-900 border shadow-xl transition-all ${
                          isActive ? "border-indigo-400 ring-2 ring-indigo-500/40" : "border-white/10"
                        }`}
                      >
                        <video
                          ref={(el) => { videoRefs.current[participant.identity] = el; }}
                          autoPlay
                          playsInline
                          muted={participant.isLocal}
                          className="absolute inset-0 w-full h-full object-contain bg-black"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-10">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white truncate">{participant.name}</p>
                              <p className="text-[10px] text-zinc-300 truncate">{roleLabel(participant.role)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {participant.hasAudio ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                              {participant.handRaised && <Hand className="w-3.5 h-3.5 text-amber-400" />}
                              {isActive && <Wifi className="w-3.5 h-3.5 text-indigo-300" />}
                            </div>
                          </div>
                        </div>
                        {participant.reaction && (
                          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2 py-1 text-sm">
                            {participant.reaction}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-500">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center text-4xl font-black text-zinc-300 z-10 relative border border-zinc-700 shadow-xl">
                      {activeSpeaker?.initials || "AR"}
                    </div>
                    {activeSpeaker?.isSpeaking && (
                      <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping z-0 scale-150"></div>
                    )}
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold text-white">{activeSpeaker?.name || course.instructor}</h2>
                    <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
                      {activeSpeaker?.hasAudio ? <Mic className="w-4 h-4 text-emerald-400"/> : <MicOff className="w-4 h-4 text-red-400"/>}
                      <span>{roleLabel(activeSpeaker?.role)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Speaker Label Overlay */}
              {videoParticipants.length === 0 && (
              <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-2 border border-white/10 shadow-lg">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  {activeSpeaker?.name || course.instructor}
                </div>
              </div>
              )}
            </div>
          </div>

          {/* Bottom Control Bar Fixed (Non-overlay) */}
          <div
            ref={controlsRef}
            data-tv-zone="live-controls"
            className="shrink-0 min-h-[80px] w-full max-w-full bg-zinc-900 border-t border-white/5 flex items-center justify-start md:justify-center z-30 px-2 sm:px-4 box-border overflow-x-auto hide-scrollbar py-2"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 shrink-0">
              
              {/* Audio / Video Group */}
              <div className="flex items-center gap-2 mr-2 md:mr-4 pr-2 md:pr-4 border-r border-white/10">
                <button 
                  type="button"
                  data-tv-focusable
                  tabIndex={0}
                  onClick={onToggleMic} 
                  aria-label={isMicEnabled ? "Couper le micro (M)" : "Activer le micro (M)"}
                  aria-pressed={isMicEnabled}
                  className={`kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl transition-all ${isMicEnabled ? "hover:bg-zinc-800 text-zinc-200" : "bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30"}`}
                >
                  {isMicEnabled ? <Mic className="w-5 h-5 mb-1.5" /> : <MicOff className="w-5 h-5 mb-1.5" />}
                  <span className="text-[10px] font-bold">{isMicEnabled ? "Désactiver" : "Activer"}</span>
                </button>
                <button 
                  type="button"
                  data-tv-focusable
                  tabIndex={0}
                  onClick={onToggleCamera} 
                  aria-label={isCameraEnabled ? "Couper la caméra" : "Activer la caméra"}
                  aria-pressed={isCameraEnabled}
                  className={`kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl transition-all ${isCameraEnabled ? "hover:bg-zinc-800 text-zinc-200" : "bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30"}`}
                >
                  {isCameraEnabled ? <Video className="w-5 h-5 mb-1.5" /> : <VideoOff className="w-5 h-5 mb-1.5" />}
                  <span className="text-[10px] font-bold">{isCameraEnabled ? "Caméra" : "Caméra"}</span>
                </button>
              </div>

              {/* Interaction Group */}
              <div className="flex items-center gap-2">
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
                  aria-label="Lever la main"
                  className="kbd-nav-focus flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl hover:bg-zinc-800 text-zinc-300 transition-all group"
                >
                  <Hand className="w-5 h-5 mb-1.5 group-hover:text-amber-400 transition-colors" />
                  <span className="text-[10px] font-bold">Main</span>
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

              {/* Host Controls */}
              {canModerate && (
                <div className="flex items-center gap-2 ml-2 md:ml-4 pl-2 md:pl-4 border-l border-white/10">
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

              {/* Leave Button */}
              <div className="ml-2 md:ml-4 pl-2 md:pl-4 border-l border-white/10">
                <button 
                  type="button"
                  data-tv-focusable
                  tabIndex={0}
                  onClick={onLeave} 
                  aria-label="Quitter le live (L)"
                  className="kbd-nav-focus touch-target h-12 min-h-[48px] px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all shadow-md flex items-center justify-center"
                >
                  Quitter
                </button>
              </div>

            </div>
          </div>
        </main>

        {/* Right Sidebar - Onglets Académiques */}
        <aside 
          ref={sidebarRef}
          data-tv-zone="live-sidebar"
          className={`absolute lg:static right-0 top-0 bottom-0 w-[min(100vw,360px)] lg:w-[360px] max-w-full lg:min-w-[360px] shrink-0 bg-zinc-900 border-l border-white/5 flex flex-col transition-transform duration-300 ease-out z-40 box-border lg:min-h-[480px] shadow-2xl lg:shadow-none ${isSidebarOpen ? "translate-x-0 lg:flex" : "translate-x-full lg:hidden"}`}
        >
          {/* Sidebar Tabs */}
          <div className="px-3 pt-4 pb-2 grid grid-cols-4 gap-1 shrink-0 border-b border-white/5 bg-zinc-900/50">
            {tabs.map((tab) => (
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

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-zinc-950/30">
            
            {activeTab === "participants" && (
              <div className="space-y-4 animate-in fade-in duration-300">
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
              <div className="h-full flex flex-col animate-in fade-in duration-300">
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

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar min-h-[300px]">
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
                  <div className="border-t border-white/5 pt-3">
                    <AITutorChat courseTitle={course.title} moduleTitle={course.liveSubject || "Session live"} className="min-h-[240px] h-[min(360px,40dvh)] flex-1 border-none shadow-none bg-zinc-950" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "whiteboard" && (
              <div className="space-y-4 animate-in fade-in duration-300 flex flex-col h-full">
                <div className="flex gap-2 shrink-0">
                  {[{ id: 'draw', icon: PenTool, label: 'Dessin libre' }, { id: 'shapes', icon: Shapes, label: 'Géométrie' }].map((tool) => (
                    <button key={tool.id} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center gap-2 border border-white/5 transition-colors">
                      <tool.icon className="w-4 h-4 text-zinc-300" />
                      <span className="text-[11px] font-bold">{tool.label}</span>
                    </button>
                  ))}
                </div>
                <div ref={whiteboardContainerRef} className="flex-1 bg-white rounded-xl overflow-hidden shadow-inner border border-white/10 min-h-[240px]">
                  <canvas
                    ref={canvasRef}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    onTouchCancel={stopDrawing}
                    className="w-full h-full touch-none cursor-crosshair"
                  />
                </div>
                <button onClick={clearWhiteboard} className="shrink-0 w-full py-2.5 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20">
                  Nettoyer le tableau
                </button>
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
        </aside>

      </div>
    </div>
  );
}
