import React from "react";
import { Room } from "livekit-client";
import { MicOff, MoreVertical, PictureInPicture2 } from "lucide-react";
import { Course } from "../types";
import { LiveChatMessage } from "../livekit";
import LiveSettingsPanel from "./live/LiveSettingsPanel";
import LiveWhiteboardPanel from "./live/LiveWhiteboardPanel";
import LiveClassroomHeader from "./live/LiveClassroomHeader";
import LiveStatsBar from "./live/LiveStatsBar";
import LiveControlBar from "./live/LiveControlBar";
import LiveVideoStage from "./live/LiveVideoStage";
import LiveParticipantsPanel from "./live/LiveParticipantsPanel";
import LiveChatPanel from "./live/LiveChatPanel";
import LiveToolsPanel from "./live/LiveToolsPanel";
import LiveAttendancePanel from "./live/LiveAttendancePanel";
import type { LivePollState, LiveSharedResource, LiveWhiteboardStroke } from "../live/live-sync";
import { useVirtualClassroomUI } from "../hooks/useVirtualClassroomUI";

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

export default function VirtualClassroom({
  mode,
  course,
  currentUserRole,
  liveRoom,
  participants,
  chatMessages,
  chatDraft,
  setChatDraft,
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
  const ui = useVirtualClassroomUI({
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
  });

  return (
    <div className="live-classroom-root w-full max-w-full h-full min-h-0 bg-zinc-950 text-white font-sans flex flex-col relative box-border flex-1 overflow-hidden">
      <span className="sr-only">Classe virtuelle sécurisée</span>
      <span className="sr-only">Tableau blanc collaboratif</span>
      <span className="sr-only">Rapport de présence</span>

      {ui.pipError && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-amber-500/40 shadow-2xl rounded-xl p-4 flex items-center gap-4 max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-amber-500/20 p-2 rounded-full">
            <PictureInPicture2 className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-white mb-0.5">Picture-in-Picture</h4>
            <p className="text-[11px] text-zinc-300">{ui.pipError}</p>
          </div>
          <button
            onClick={ui.clearPipError}
            className="px-3 py-1.5 bg-white text-zinc-900 text-[11px] font-bold rounded-lg hover:bg-zinc-200 transition-colors shrink-0"
          >
            OK
          </button>
        </div>
      )}

      {ui.liveSettings.focusMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-[11px] font-bold text-emerald-200 shadow-lg backdrop-blur-md">
          Mode concentration actif
        </div>
      )}

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

      <LiveClassroomHeader
        course={course}
        isRecording={isRecording}
        focusMode={ui.liveSettings.focusMode}
        onBack={onBack}
        onOpenWhiteboard={() => ui.openPanelTab("whiteboard")}
        onOpenSettings={() => ui.setIsSettingsOpen(true)}
      />

      <div
        className={`live-classroom-main flex flex-1 min-h-0 w-full max-w-full relative box-border overflow-hidden flex-col lg:grid lg:items-stretch ${
          ui.isSidebarOpen ? "lg:grid-cols-[minmax(0,1fr)_420px]" : "lg:grid-cols-1"
        }`}
      >
        {!ui.isSidebarOpen && (
          <button
            type="button"
            aria-label="Ouvrir le panneau interactif"
            className="lg:hidden fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-xl border border-white/10 border-r-0 bg-zinc-900/95 px-2 py-4 text-zinc-200 shadow-xl backdrop-blur-md"
            onClick={() => ui.setIsSidebarOpen(true)}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        )}

        {ui.isSidebarOpen && (
          <button
            type="button"
            aria-label="Fermer le panneau interactif"
            className="absolute inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => ui.setIsSidebarOpen(false)}
          />
        )}

        <main
          ref={stageRef}
          data-live-stage="main"
          className="live-classroom-stage flex flex-col min-w-0 min-h-0 h-full w-full relative bg-black box-border overflow-hidden"
        >
          <LiveStatsBar
            elapsedSeconds={ui.elapsedSeconds}
            focusMode={ui.liveSettings.focusMode}
            connectedCount={ui.connectedParticipants.length}
            raisedHands={ui.raisedHands}
            questionsCount={ui.questionsCount}
            averageQuality={ui.averageQuality}
          />

          <LiveControlBar
            controlsRef={ui.controlsRef}
            isMicEnabled={isMicEnabled}
            isCameraEnabled={isCameraEnabled}
            isScreenShareEnabled={isScreenShareEnabled}
            isFullscreen={isFullscreen}
            isRecording={isRecording}
            isPiPActive={ui.isPiPActive}
            focusMode={ui.liveSettings.focusMode}
            canModerate={ui.canModerate}
            localReaction={ui.localReaction}
            onToggleMic={onToggleMic}
            onToggleCamera={onToggleCamera}
            onToggleScreenShare={onToggleScreenShare}
            onRaiseHand={onRaiseHand}
            onTogglePictureInPicture={() => { void ui.togglePictureInPicture(); }}
            onToggleFocusMode={ui.toggleFocusMode}
            onToggleFullscreen={onToggleFullscreen}
            onRecordToggle={onRecordToggle}
            onReaction={onReaction}
            onExit={ui.exitLiveSession}
          />

          <LiveVideoStage
            connectionNotice={ui.connectionNotice}
            whiteboardExpanded={ui.whiteboardExpanded}
            onCollapseWhiteboard={() => ui.setWhiteboardExpanded(false)}
            canModerate={ui.canModerate}
            whiteboardStrokes={whiteboardStrokes}
            localIdentity={localIdentity}
            onWhiteboardStroke={onWhiteboardStroke}
            onWhiteboardClear={onWhiteboardClear}
            videoGridClass={ui.videoGridClass}
            stageParticipants={ui.stageParticipants}
            activeSpeaker={ui.activeSpeaker}
            featuredLayout={ui.featuredLayout}
            registerVideoRef={ui.registerParticipantVideoRef}
            sharedResource={sharedResource}
            onDismissResource={onDismissResource}
          />
        </main>

        <aside
          ref={ui.sidebarRef}
          data-tv-zone="live-sidebar"
          data-live-sidebar
          className={`live-classroom-sidebar absolute lg:static right-0 top-0 bottom-0 w-[min(100vw,420px)] lg:w-[420px] max-w-full lg:min-w-[420px] shrink-0 bg-zinc-900 border-l border-white/5 flex flex-col min-h-0 h-full max-h-full overflow-hidden transition-transform duration-300 ease-out z-40 box-border shadow-2xl lg:shadow-none ${ui.isSidebarOpen ? "translate-x-0 lg:flex" : "translate-x-full lg:hidden"}`}
        >
          <div className={`px-3 pt-4 pb-2 grid gap-1 shrink-0 border-b border-white/5 bg-zinc-900/50 ${
            ui.visibleSidebarTabs.length <= 2 ? "grid-cols-2" : ui.visibleSidebarTabs.length === 3 ? "grid-cols-3" : "grid-cols-5"
          }`}>
            {ui.visibleSidebarTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-tv-focusable
                tabIndex={0}
                onClick={() => ui.setActiveTab(tab.id)}
                aria-label={`Onglet ${tab.label}`}
                aria-selected={ui.activeTab === tab.id}
                className={`kbd-nav-focus flex flex-col items-center justify-center py-2 rounded-lg transition-all min-h-[52px] ${
                  ui.activeTab === tab.id
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                <tab.icon className="w-4 h-4 mb-1" />
                <span className="text-[9px] font-bold text-center leading-tight px-1">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-1 min-h-0 flex-col overflow-hidden p-3 sm:p-4 bg-zinc-950/30">
            <div
              className={`flex-1 min-h-0 ${
                ui.activeTab === "chat"
                  ? "flex flex-col overflow-hidden"
                  : "overflow-y-auto custom-scrollbar"
              }`}
            >
              {ui.activeTab === "participants" && (
                <LiveParticipantsPanel
                  raisedHandParticipants={ui.raisedHandParticipants}
                  participantQuery={ui.participantQuery}
                  onParticipantQueryChange={ui.setParticipantQuery}
                  filteredParticipants={ui.filteredParticipants}
                  canModerate={ui.canModerate}
                  onModerateParticipant={onModerateParticipant}
                />
              )}

              {ui.activeTab === "chat" && (
                <LiveChatPanel
                  course={course}
                  chatView={ui.chatView}
                  onChatViewChange={ui.setChatView}
                  messageMode={ui.messageMode}
                  onMessageModeChange={ui.setMessageMode}
                  privateTarget={ui.privateTarget}
                  onPrivateTargetChange={ui.setPrivateTarget}
                  connectedParticipants={ui.connectedParticipants}
                  chatMessages={chatMessages}
                  chatDraft={chatDraft}
                  onChatDraftChange={setChatDraft}
                  onSendMessage={onSendMessage}
                />
              )}

              {ui.activeTab === "whiteboard" && !ui.whiteboardExpanded && (
                <LiveWhiteboardPanel
                  expanded={false}
                  onToggleExpanded={() => {
                    ui.setWhiteboardExpanded(true);
                    ui.setIsSidebarOpen(false);
                  }}
                  canModerate={ui.canModerate}
                  strokes={whiteboardStrokes}
                  localIdentity={localIdentity}
                  onStrokeComplete={onWhiteboardStroke}
                  onClear={onWhiteboardClear}
                />
              )}

              {ui.activeTab === "tools" && (
                <LiveToolsPanel
                  canModerate={ui.canModerate}
                  livePoll={livePoll}
                  myPollVote={myPollVote}
                  onPollQuestionChange={onPollQuestionChange}
                  onPublishPoll={onPublishPoll}
                  onEndPoll={onEndPoll}
                  onVotePoll={onVotePoll}
                  resourceTitle={ui.resourceTitle}
                  resourceUrl={ui.resourceUrl}
                  onResourceTitleChange={ui.setResourceTitle}
                  onResourceUrlChange={ui.setResourceUrl}
                  onShareResource={ui.shareResource}
                />
              )}

              {ui.activeTab === "attendance" && (
                <LiveAttendancePanel
                  attendanceReport={attendanceReport}
                  connectedParticipants={ui.connectedParticipants}
                  elapsedSeconds={ui.elapsedSeconds}
                  attendanceRows={ui.attendanceRows}
                  onExportAttendance={() => onLiveEvent("QUESTION", { type: "attendance_export_requested" })}
                />
              )}
            </div>
          </div>
        </aside>
      </div>

      <LiveSettingsPanel
        open={ui.isSettingsOpen}
        onClose={() => ui.setIsSettingsOpen(false)}
        settings={ui.liveSettings}
        onVideoQualityChange={ui.setVideoQuality}
        onLayoutModeChange={ui.setLayoutMode}
        onFocusModeChange={ui.setFocusMode}
        onSubtitleLanguageChange={ui.setSubtitleLanguage}
        pipSupported={ui.pipSupported}
        isPiPActive={ui.isPiPActive}
        onTogglePiP={() => { void ui.togglePictureInPicture(); }}
      />
    </div>
  );
}
