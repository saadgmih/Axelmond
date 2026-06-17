import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type MutableRefObject } from "react";
import type { Room } from "livekit-client";
import VirtualClassroom, { type LiveParticipantCard, type VirtualClassroomProps } from "../components/VirtualClassroom";
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
import { buildLiveParticipantCards } from "./livekit/participant-sync";
import { applyLiveSyncMessage, respondToLiveSyncRequest } from "./livekit/live-sync-state";
import {
  createPublishLiveSync,
  refreshLiveAttendanceReport as fetchLiveAttendanceReport,
} from "./livekit/live-sync-publish";
import { useLiveKitConnection } from "./livekit/useLiveKitConnection";
import { useLiveRoomControls } from "./livekit/useLiveRoomControls";
import { useLiveMediaAttach } from "./livekit/useLiveMediaAttach";

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
  onStudentLiveEnded?: (courseId: number) => void;
  roomRef?: MutableRefObject<{
    closeTeacherLiveRoom: () => Promise<void>;
  } | null>;
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
  handleToggleCourseLive: _handleToggleCourseLive,
  onStudentLiveEnded,
  roomRef,
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
  const activeSpeakerIdentityRef = useRef(activeSpeakerIdentity);
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
    activeSpeakerIdentityRef.current = activeSpeakerIdentity;
  }, [activeSpeakerIdentity]);

  useEffect(() => {
    liveSignalsRef.current = liveSignals;
  }, [liveSignals]);

  const syncLiveParticipants = useCallback(
    (room: Room) => {
      setLiveParticipants(
        buildLiveParticipantCards(room, {
          currentUser,
          activeSpeakerIdentity: activeSpeakerIdentityRef.current,
          liveSignals: liveSignalsRef.current,
          getInitials,
        }),
      );
    },
    [currentUser, getInitials],
  );

  const appendLiveChatMessage = useCallback((message: LiveChatMessage) => {
    setLiveChatMessages((prev) => [...prev.slice(-49), message]);
  }, []);

  const publishLiveSync = useMemo(
    () =>
      createPublishLiveSync({
        activeLiveCourseId: activeLiveCourse?.id,
        canModerateLive,
        livePollRef,
        whiteboardStrokesRef,
      }),
    [activeLiveCourse?.id, canModerateLive],
  );

  const applyIncomingLiveSyncMessage = useCallback((message: LiveSyncMessage, localIdentity: string) => {
    applyLiveSyncMessage(message, localIdentity, {
      setWhiteboardStrokes,
      setLivePoll,
      setMyPollVote,
      setSharedResource,
    });
  }, []);

  const respondToSyncRequest = useCallback(
    async (room: Room, requesterIdentity?: string) => {
      await respondToLiveSyncRequest(
        room,
        requesterIdentity,
        canModerateLive,
        {
          whiteboardStrokes: whiteboardStrokesRef.current,
          livePoll: livePollRef.current,
          sharedResource: sharedResourceRef.current,
        },
        publishLiveSync,
      );
    },
    [canModerateLive, publishLiveSync],
  );

  const refreshLiveAttendanceReport = useCallback(
    (courseId: number) => fetchLiveAttendanceReport(courseId, setLiveAttendanceReport),
    [],
  );

  useLiveKitConnection({
    activeLiveCourse,
    currentUser,
    liveReconnectNonce,
    liveRoom,
    activeSpeakerIdentity,
    liveSignals,
    livePollRef,
    whiteboardStrokesRef,
    sharedResourceRef,
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
    onLiveEnded: () => {
      const endedCourseId = activeLiveCourse?.id;
      void leaveLiveRoom({ liveEnded: true }).then(() => {
        if (endedCourseId) onStudentLiveEnded?.(endedCourseId);
      });
      alert("La session live a été terminée par le professeur.");
    },
  });

  useLiveMediaAttach({
    liveParticipants,
    currentView,
    teacherView,
    activeLiveCourseId: activeLiveCourse?.id,
    liveVideoRefs,
    liveAudioContainerRef,
  });

  const {
    toggleLiveMic,
    toggleLiveCamera,
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
  } = useLiveRoomControls({
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
    whiteboardStrokesRef,
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
  });

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

  const joinTeacherLiveRoom = (courseOverride?: Course) => {
    const course = courseOverride ?? courses.find((c) => c.id === liveCourseId);
    if (!course) return;
    console.info("[livekit] Teacher opening live room", { courseId: course.id, role: currentUser?.role });
    setSelectedCourse(course);
    setActiveLiveCourse(course);
    setTeacherView("live-control");
  };

  const closeTeacherLiveRoom = async () => {
    const course = activeLiveCourse;
    if (course) {
      try {
        await publishLiveSync(liveRoom, { type: "LIVE_ENDED" });
      } catch (err) {
        console.warn("[livekit] Failed to publish LIVE_ENDED message", err);
      }
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
        await closeTeacherLiveRoom();
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

  const leaveLiveRoom = async (options: { liveEnded?: boolean } = {}) => {
    const course = activeLiveCourse;
    if (course) {
      if (currentUser && !isStudentRole(currentUser.role)) {
        try {
          await publishLiveSync(liveRoom, { type: "LIVE_ENDED" });
        } catch (err) {
          console.warn("[livekit] Failed to publish LIVE_ENDED message", err);
        }
        api.leaveLiveAttendance(course.id).catch((err) => console.warn("[livekit] Attendance leave failed", err));
        if (_handleToggleCourseLive) {
          await _handleToggleCourseLive(course.id);
        }
      } else {
        api.leaveLiveAttendance(course.id).catch((err) => console.warn("[livekit] Attendance leave failed", err));
      }
    }
    resetLiveKitState();
    if (course && currentUser && isStudentRole(currentUser.role)) {
      setSelectedCourse(options.liveEnded ? { ...course, isLiveNow: false, liveSubject: null } : course);
      setCurrentView(options.liveEnded ? "dashboard" : "course");
    }
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

  useEffect(() => {
    if (roomRef) {
      roomRef.current = {
        closeTeacherLiveRoom,
      };
      return () => {
        roomRef.current = null;
      };
    }
  }, [roomRef, closeTeacherLiveRoom]);

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
