import { useEffect, useRef, useState, type ReactNode } from "react";
import { Room } from "livekit-client";
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
  createEmptyPoll,
  type LivePollState,
  type LiveSharedResource,
  type LiveSyncMessage,
  type LiveWhiteboardStroke,
} from "../live/live-sync";
import { applyLiveSyncMessage, respondToLiveSyncRequest } from "./livekit/live-sync-state";
import { createPublishLiveSync, refreshLiveAttendanceReport } from "./livekit/live-sync-publish";
import { buildLiveParticipantCards } from "./livekit/participant-sync";
import { useLiveKitConnection } from "./livekit/useLiveKitConnection";
import { useLiveMediaAttach } from "./livekit/useLiveMediaAttach";
import { useLiveRoomControls } from "./livekit/useLiveRoomControls";

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

  useEffect(() => { whiteboardStrokesRef.current = whiteboardStrokes; }, [whiteboardStrokes]);
  useEffect(() => { sharedResourceRef.current = sharedResource; }, [sharedResource]);
  useEffect(() => { livePollRef.current = livePoll; }, [livePoll]);
  useEffect(() => { liveSignalsRef.current = liveSignals; }, [liveSignals]);

  const syncLiveParticipants = (room: Room) => {
    setLiveParticipants(buildLiveParticipantCards(room, { currentUser, activeSpeakerIdentity, liveSignals, getInitials }));
  };

  const appendLiveChatMessage = (message: LiveChatMessage) => {
    setLiveChatMessages((prev) => [...prev.slice(-49), message]);
  };

  const publishLiveSync = createPublishLiveSync({
    activeLiveCourseId: activeLiveCourse?.id,
    canModerateLive,
    livePollRef,
    whiteboardStrokesRef,
  });

  const applyIncomingLiveSyncMessage = (message: LiveSyncMessage, localIdentity: string) => {
    applyLiveSyncMessage(message, localIdentity, { setWhiteboardStrokes, setLivePoll, setMyPollVote, setSharedResource });
  };

  const respondToSyncRequest = async (room: Room, requesterIdentity?: string) => {
    await respondToLiveSyncRequest(
      room,
      requesterIdentity,
      canModerateLive,
      { whiteboardStrokes: whiteboardStrokesRef.current, livePoll: livePollRef.current, sharedResource: sharedResourceRef.current },
      publishLiveSync,
    );
  };

  const refreshAttendance = (courseId: number) => refreshLiveAttendanceReport(courseId, setLiveAttendanceReport);

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

  useLiveKitConnection({
    activeLiveCourse, currentUser, liveReconnectNonce, liveRoom, activeSpeakerIdentity, liveSignals,
    livePollRef, whiteboardStrokesRef, sharedResourceRef, setLiveRoom, setLiveParticipants, setLiveChatMessages,
    setLiveStatusMsg, setIsMicEnabled, setIsCameraEnabled, setIsScreenShareEnabled, setActiveSpeakerIdentity,
    setLiveSignals, setLiveAttendanceReport, syncLiveParticipants, appendLiveChatMessage, applyIncomingLiveSyncMessage,
    respondToSyncRequest, publishLiveSync, refreshLiveAttendanceReport: refreshAttendance, updateSessionUser,
    setEnrolledCourses, setInvoices, setCourseToPurchase,
  });

  useLiveMediaAttach({
    liveParticipants, activeSpeakerIdentity, currentView, teacherView, activeLiveCourseId: activeLiveCourse?.id,
    primaryLiveVideoRef, liveVideoRefs, liveAudioContainerRef,
  });

  const controls = useLiveRoomControls({
    liveRoom, activeLiveCourse, currentUser, canModerateLive, isMicEnabled, isCameraEnabled, isScreenShareEnabled,
    isLiveRecording, liveChatDraft, liveSignals, livePollRef, whiteboardStrokesRef, whiteboardStrokeTimestampsRef,
    liveSignalsRef, liveStageRef, setIsMicEnabled, setIsCameraEnabled, setIsScreenShareEnabled, setIsLiveFullscreen,
    setIsLiveRecording, setLiveStatusMsg, setLiveChatDraft, setLiveSignals, setLivePoll, setMyPollVote,
    setWhiteboardStrokes, setSharedResource, setLiveRoom, setLiveParticipants, setLiveReconnectNonce,
    syncLiveParticipants, appendLiveChatMessage, publishLiveSync, refreshLiveAttendanceReport: refreshAttendance,
  });

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
    if (course) api.leaveLiveAttendance(course.id).catch((err) => console.warn("[livekit] Attendance leave failed", err));
    resetLiveKitState();
  };

  const toggleTeacherLiveSession = async (courseId: number, toggleCourseLive: (id: number) => Promise<Course | null>) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    const isRoomOpen = activeLiveCourse?.id === courseId;
    if (course.isLiveNow) {
      if (isRoomOpen) { closeTeacherLiveRoom(); await toggleCourseLive(courseId); }
      else joinTeacherLiveRoom(course);
      return;
    }
    const updatedCourse = await toggleCourseLive(courseId);
    if (updatedCourse) joinTeacherLiveRoom(updatedCourse);
  };

  const leaveLiveRoom = () => {
    const course = activeLiveCourse;
    if (course) api.leaveLiveAttendance(course.id).catch((err) => console.warn("[livekit] Attendance leave failed", err));
    resetLiveKitState();
    if (course && currentUser && isStudentRole(currentUser.role)) {
      setSelectedCourse(course);
      setCurrentView("course");
    }
  };

  const classroomBindings: LiveKitClassroomBindings = {
    liveRoom, participants: liveParticipants, chatMessages: liveChatMessages, chatDraft: liveChatDraft,
    setChatDraft: setLiveChatDraft, statusMessage: liveStatusMsg, isMicEnabled, isCameraEnabled,
    isScreenShareEnabled, isFullscreen: isLiveFullscreen, isRecording: isLiveRecording, activeSpeakerIdentity,
    attendanceReport: liveAttendanceReport, primaryVideoRef: primaryLiveVideoRef, videoRefs: liveVideoRefs,
    stageRef: liveStageRef, onToggleMic: controls.toggleLiveMic, onToggleCamera: controls.toggleLiveCamera,
    onToggleScreenShare: controls.toggleLiveScreenShare, onToggleFullscreen: controls.toggleLiveFullscreen,
    onSendMessage: controls.sendLiveChatMessage, onRaiseHand: controls.toggleLiveHand, onReaction: controls.sendLiveReaction,
    onRecordToggle: controls.toggleLiveRecording, onModerateParticipant: controls.handleLiveModeration,
    onLiveEvent: controls.publishLiveAction, onReconnectLive: controls.reconnectLiveSession, livePoll, myPollVote,
    onPublishPoll: controls.publishLivePoll, onEndPoll: controls.endLivePoll, onVotePoll: controls.voteLivePoll,
    onPollQuestionChange: controls.updateLivePollQuestion, whiteboardStrokes,
    localIdentity: liveRoom?.localParticipant.identity || String(currentUser?.id || "local"),
    onWhiteboardStroke: controls.publishWhiteboardStroke, onWhiteboardClear: controls.clearLiveWhiteboard,
    sharedResource, onShareResource: controls.shareLiveResource, onDismissResource: controls.dismissLiveResource,
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
