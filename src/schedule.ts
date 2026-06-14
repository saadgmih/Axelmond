export const SCHEDULE_DAYS = [
  { value: 0, label: "Lundi" },
  { value: 1, label: "Mardi" },
  { value: 2, label: "Mercredi" },
  { value: 3, label: "Jeudi" },
  { value: 4, label: "Vendredi" },
  { value: 5, label: "Samedi" },
  { value: 6, label: "Dimanche" },
] as const;

export const SCHEDULE_SESSION_TYPES = [
  { value: "COURS", label: "Cours" },
  { value: "TD", label: "TD" },
  { value: "TP", label: "TP" },
  { value: "LIVE", label: "Live" },
  { value: "EXAMEN", label: "Examen" },
] as const;

export type ScheduleDayValue = (typeof SCHEDULE_DAYS)[number]["value"];
export type ScheduleSessionTypeValue = (typeof SCHEDULE_SESSION_TYPES)[number]["value"];

export interface ScheduleSessionRecord {
  id: string;
  professorId: string;
  dayOfWeek: number;
  title: string;
  moduleName: string;
  startTime: string;
  endTime: string;
  sessionType: ScheduleSessionTypeValue;
  roomOrLink?: string | null;
  description?: string | null;
}

export interface ScheduleSessionPayload {
  dayOfWeek: number;
  title: string;
  moduleName: string;
  startTime: string;
  endTime: string;
  sessionType: ScheduleSessionTypeValue;
  roomOrLink?: string;
  description?: string;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function getScheduleDayLabel(dayOfWeek: number): string {
  return SCHEDULE_DAYS.find((day) => day.value === dayOfWeek)?.label || "Jour inconnu";
}

export function parseScheduleTimeToMinutes(value: string): number | null {
  if (!TIME_PATTERN.test(String(value || "").trim())) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isValidScheduleTime(value: string): boolean {
  return parseScheduleTimeToMinutes(value) !== null;
}

export function validateScheduleEndAfterStart(startTime: string, endTime: string): string | null {
  const start = parseScheduleTimeToMinutes(startTime);
  const end = parseScheduleTimeToMinutes(endTime);
  if (start === null || end === null) return "Format horaire invalide (HH:mm)";
  if (end <= start) return "L'heure de fin doit être postérieure à l'heure de début";
  return null;
}

export function sessionsOverlapOnSameDay(
  left: Pick<ScheduleSessionRecord, "dayOfWeek" | "startTime" | "endTime" | "id">,
  right: Pick<ScheduleSessionRecord, "dayOfWeek" | "startTime" | "endTime" | "id">,
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

export function findScheduleOverlap(
  candidate: ScheduleSessionPayload & { id?: string },
  existingSessions: ScheduleSessionRecord[],
): ScheduleSessionRecord | null {
  const candidateRecord: ScheduleSessionRecord = {
    id: candidate.id || "__candidate__",
    professorId: "",
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

export function canAccessProfessorScheduleSession(sessionProfessorId: string, authUserId: string): boolean {
  return sessionProfessorId === authUserId;
}

export function validateSchedulePayload(
  payload: Partial<ScheduleSessionPayload>,
  existingSessions: ScheduleSessionRecord[],
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

  const normalized: ScheduleSessionPayload = {
    dayOfWeek: payload.dayOfWeek,
    title: String(payload.title).trim(),
    moduleName: String(payload.moduleName).trim(),
    startTime: String(payload.startTime).trim(),
    endTime: String(payload.endTime).trim(),
    sessionType: (payload.sessionType || "COURS") as ScheduleSessionTypeValue,
    roomOrLink: payload.roomOrLink?.trim() || undefined,
    description: payload.description?.trim() || undefined,
  };

  const overlap = findScheduleOverlap(
    { ...normalized, id: options?.excludeId },
    existingSessions.filter((session) => session.id !== options?.excludeId),
  );
  if (overlap) {
    return `Conflit horaire avec « ${overlap.title} » (${overlap.startTime} - ${overlap.endTime})`;
  }

  return null;
}

export function sortScheduleSessions<T extends Pick<ScheduleSessionRecord, "dayOfWeek" | "startTime">>(
  sessions: T[],
): T[] {
  return [...sessions].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return (parseScheduleTimeToMinutes(a.startTime) || 0) - (parseScheduleTimeToMinutes(b.startTime) || 0);
  });
}

export function serializeScheduleSession(session: ScheduleSessionRecord) {
  return {
    id: session.id,
    professorId: session.professorId,
    dayOfWeek: session.dayOfWeek,
    dayLabel: getScheduleDayLabel(session.dayOfWeek),
    title: session.title,
    moduleName: session.moduleName,
    startTime: session.startTime,
    endTime: session.endTime,
    sessionType: session.sessionType,
    sessionTypeLabel:
      SCHEDULE_SESSION_TYPES.find((type) => type.value === session.sessionType)?.label || session.sessionType,
    roomOrLink: session.roomOrLink || "",
    description: session.description || "",
  };
}
