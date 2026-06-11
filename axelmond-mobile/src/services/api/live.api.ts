import type {
  LiveAttendanceReport,
  LiveEventAction,
  LiveKitSession,
  LiveMessage,
  LiveModerationAction,
} from "../../types";
import { apiRequest } from "./client";

export const liveApi = {
  /** Obtain a LiveKit room token (TTL ~15 min server-side). */
  getToken: (courseId: number) =>
    apiRequest<LiveKitSession>("POST", "/api/livekit/token", { courseId }),

  /** Load persisted chat history for a course live session. */
  getMessages: (courseId: number) =>
    apiRequest<LiveMessage[]>("GET", `/api/livekit/messages/${courseId}`),

  /** Persist a chat message (also broadcast via LiveKit data channel in V2.1+). */
  sendMessage: (courseId: number, message: { id: string | number; text: string }) =>
    apiRequest<{ id: string }>("POST", "/api/livekit/messages", {
      courseId,
      messageId: String(message.id),
      text: message.text,
    }),

  /** Record attendance leave when exiting a live session. */
  leaveAttendance: (courseId: number) =>
    apiRequest<{ ok: boolean; attendance: { joinedAt: string; leftAt: string; durationSeconds: number } | null }>(
      "POST",
      "/api/livekit/attendance/leave",
      { courseId },
    ),

  /** Attendance report (teacher/admin: full room; student: own records). */
  getAttendance: (courseId: number) =>
    apiRequest<LiveAttendanceReport>("GET", `/api/livekit/attendance/${courseId}`),

  /** Raise hand, reactions, and other live classroom signals. */
  logEvent: (data: {
    courseId: number;
    action: LiveEventAction;
    targetIdentity?: string | null;
    targetName?: string | null;
    details?: Record<string, unknown>;
  }) => apiRequest<{ ok: true }>("POST", "/api/livekit/events", data),

  /** Teacher moderation actions (mute, remove, grant speech). */
  moderate: (data: {
    courseId: number;
    action: LiveModerationAction;
    targetIdentity: string;
    targetName?: string | null;
    trackSid?: string | null;
  }) => apiRequest<{ ok: true }>("POST", "/api/livekit/moderation", data),
};
