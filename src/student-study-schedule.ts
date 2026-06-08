import {
  SCHEDULE_DAYS,
  getScheduleDayLabel,
  parseScheduleTimeToMinutes,
  sortScheduleSessions,
  validateScheduleEndAfterStart,
} from "./schedule";

export { SCHEDULE_DAYS, getScheduleDayLabel, sortScheduleSessions as sortStudentStudySessions };

export const STUDENT_STUDY_SESSION_TYPES = [
  { value: "REVISION", label: "Révision" },
  { value: "COURS", label: "Cours" },
  { value: "TD", label: "TD" },
  { value: "TP", label: "TP" },
  { value: "LIVE", label: "Live" },
  { value: "DEVOIR", label: "Devoir" },
  { value: "EXAMEN", label: "Examen" },
] as const;

export type StudentStudySessionTypeValue = (typeof STUDENT_STUDY_SESSION_TYPES)[number]["value"];

export interface StudentStudySessionRecord {
  id: string;
  studentId: string;
  dayOfWeek: number;
  title: string;
  moduleName: string;
  startTime: string;
  endTime: string;
  sessionType: StudentStudySessionTypeValue;
  roomOrLink?: string | null;
  description?: string | null;
}

export interface StudentStudySessionPayload {
  dayOfWeek: number;
  title: string;
  moduleName: string;
  startTime: string;
  endTime: string;
  sessionType: StudentStudySessionTypeValue;
  roomOrLink?: string;
  description?: string;
}

function sessionsOverlapOnSameDay(
  left: Pick<StudentStudySessionRecord, "dayOfWeek" | "startTime" | "endTime" | "id">,
  right: Pick<StudentStudySessionRecord, "dayOfWeek" | "startTime" | "endTime" | "id">,
): boolean {
  if (left.id === right.id) return false;
  if (left.dayOfWeek !== right.dayOfWeek) return false;
  const leftStart = parseScheduleTimeToMinutes(left.startTime);
  const leftEnd = parseScheduleTimeToMinutes(left.endTime);
  const rightStart = parseScheduleTimeToMinutes(right.startTime);
  const rightEnd = parseScheduleTimeToMinutes(right.endTime);
  if (leftStart === null || leftEnd === null || rightStart === null || rightEnd === null) return false;
  return leftStart < rightEnd && rightStart < leftEnd;
}

export function findStudentStudyOverlap(
  candidate: StudentStudySessionPayload & { id?: string },
  existingSessions: StudentStudySessionRecord[],
): StudentStudySessionRecord | null {
  const candidateRecord: StudentStudySessionRecord = {
    id: candidate.id || "__candidate__",
    studentId: "",
    dayOfWeek: candidate.dayOfWeek,
    title: candidate.title,
    moduleName: candidate.moduleName,
    startTime: candidate.startTime,
    endTime: candidate.endTime,
    sessionType: candidate.sessionType,
    roomOrLink: candidate.roomOrLink,
    description: candidate.description,
  };

  for (const session of existingSessions) {
    if (sessionsOverlapOnSameDay(candidateRecord, session)) return session;
  }
  return null;
}

export function canAccessStudentStudySession(sessionStudentId: string, authUserId: string): boolean {
  return sessionStudentId === authUserId;
}

export function validateStudentStudyPayload(
  payload: Partial<StudentStudySessionPayload>,
  existingSessions: StudentStudySessionRecord[],
  options?: { excludeId?: string },
): string | null {
  if (payload.dayOfWeek === undefined || payload.dayOfWeek < 0 || payload.dayOfWeek > 6) {
    return "Jour de la semaine invalide";
  }
  if (!String(payload.title || "").trim()) return "Le titre de la séance est obligatoire";
  if (!String(payload.moduleName || "").trim()) return "Le module est obligatoire";
  if (!payload.startTime || !payload.endTime) return "Les heures de début et de fin sont obligatoires";

  const timeError = validateScheduleEndAfterStart(payload.startTime, payload.endTime);
  if (timeError) return timeError;

  const normalized: StudentStudySessionPayload = {
    dayOfWeek: payload.dayOfWeek,
    title: String(payload.title).trim(),
    moduleName: String(payload.moduleName).trim(),
    startTime: String(payload.startTime).trim(),
    endTime: String(payload.endTime).trim(),
    sessionType: (payload.sessionType || "REVISION") as StudentStudySessionTypeValue,
    roomOrLink: payload.roomOrLink?.trim() || undefined,
    description: payload.description?.trim() || undefined,
  };

  const overlap = findStudentStudyOverlap(
    { ...normalized, id: options?.excludeId },
    existingSessions.filter((session) => session.id !== options?.excludeId),
  );
  if (overlap) {
    return `Conflit horaire avec « ${overlap.title} » (${overlap.startTime} - ${overlap.endTime})`;
  }

  return null;
}

export function serializeStudentStudySession(session: StudentStudySessionRecord) {
  return {
    id: session.id,
    studentId: session.studentId,
    dayOfWeek: session.dayOfWeek,
    dayLabel: getScheduleDayLabel(session.dayOfWeek),
    title: session.title,
    moduleName: session.moduleName,
    startTime: session.startTime,
    endTime: session.endTime,
    sessionType: session.sessionType,
    sessionTypeLabel: STUDENT_STUDY_SESSION_TYPES.find((type) => type.value === session.sessionType)?.label || session.sessionType,
    roomOrLink: session.roomOrLink || "",
    description: session.description || "",
  };
}
