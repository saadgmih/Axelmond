import { decodeStoredText } from "./text";
import { isBlockedUrlScheme } from "./external-url-security";

export const STUDENT_OBJECTIVE_STATUSES = [
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COMPLETED", label: "Terminé" },
] as const;

export const STUDENT_OBJECTIVE_TYPES = [
  { value: "CHAPITRE", label: "Chapitre" },
  { value: "TD", label: "TD" },
  { value: "RESUME", label: "Résumé" },
  { value: "REVISION", label: "Révision" },
  { value: "AUTRE", label: "Autre" },
] as const;

export const FOCUS_CONTENT_TYPES = [
  { value: "PODCAST", label: "Podcast" },
  { value: "VIDEO", label: "Vidéo éducative" },
  { value: "AUDIO_REMINDER", label: "Rappel audio" },
  { value: "EDUCATIONAL_RESOURCE", label: "Ressource éducative" },
  { value: "OTHER", label: "Autre contenu" },
] as const;

export const STUDENT_OBJECTIVE_RECURRENCES = [
  { value: "NONE", label: "Pas de récurrence" },
  { value: "DAILY", label: "Chaque jour" },
  { value: "WEEKLY", label: "Chaque semaine" },
  { value: "MONTHLY", label: "Chaque mois" },
] as const;

export type StudentObjectiveStatusValue = (typeof STUDENT_OBJECTIVE_STATUSES)[number]["value"];
export type StudentObjectiveTypeValue = (typeof STUDENT_OBJECTIVE_TYPES)[number]["value"];
export type FocusContentTypeValue = (typeof FOCUS_CONTENT_TYPES)[number]["value"];
export type StudentObjectiveRecurrenceValue = (typeof STUDENT_OBJECTIVE_RECURRENCES)[number]["value"];

export interface StudentObjectiveRecord {
  id: string;
  studentId: string;
  title: string;
  description?: string | null;
  startAt: Date;
  endAt: Date;
  status: StudentObjectiveStatusValue;
  objectiveType?: StudentObjectiveTypeValue | null;
  focusContentTitle?: string | null;
  focusContentUrl?: string | null;
  focusContentType?: FocusContentTypeValue | null;
  recurrence?: StudentObjectiveRecurrenceValue | null;
  recurrenceSourceId?: string | null;
  recurrenceCreatedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentObjectivePayload {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  status?: StudentObjectiveStatusValue;
  objectiveType?: StudentObjectiveTypeValue | "";
  focusContentTitle?: string;
  focusContentUrl?: string;
  focusContentType?: FocusContentTypeValue | "";
  recurrence?: StudentObjectiveRecurrenceValue | "";
}

function getLabel<T extends { value: string; label: string }>(entries: readonly T[], value?: string | null) {
  if (!value) return "";
  return entries.find((entry) => entry.value === value)?.label || value;
}

export function canAccessStudentObjective(objectiveStudentId: string, authUserId: string): boolean {
  return objectiveStudentId === authUserId;
}

export function parseObjectiveDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isAllowedFocusContentUrl(rawUrl: string): boolean {
  const candidate = decodeStoredText(rawUrl).trim();
  if (!candidate) return true;
  if (isBlockedUrlScheme(candidate)) return false;
  if (candidate.startsWith("//")) return false;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateStudentObjectivePayload(payload: Partial<StudentObjectivePayload>): string | null {
  if (!String(payload.title || "").trim()) return "Le titre de l'objectif est obligatoire";

  const startAt = parseObjectiveDate(payload.startAt);
  const endAt = parseObjectiveDate(payload.endAt);
  if (!startAt || !endAt) return "Les dates de début et de fin sont obligatoires";
  if (endAt.getTime() <= startAt.getTime()) return "La date de fin doit être postérieure à la date de début";

  if (payload.focusContentUrl && !isAllowedFocusContentUrl(payload.focusContentUrl)) {
    return "Le lien d'écoute ou de concentration doit être une URL valide";
  }

  return null;
}

export function normalizeStudentObjectivePayload(payload: StudentObjectivePayload) {
  const startAt = parseObjectiveDate(payload.startAt);
  const endAt = parseObjectiveDate(payload.endAt);
  if (!startAt || !endAt) {
    throw new Error("Invalid objective dates");
  }

  return {
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    startAt,
    endAt,
    status: payload.status || "IN_PROGRESS",
    objectiveType: payload.objectiveType || null,
    focusContentTitle: payload.focusContentTitle?.trim() || null,
    focusContentUrl: payload.focusContentUrl ? decodeStoredText(payload.focusContentUrl).trim() || null : null,
    focusContentType: payload.focusContentType || null,
    recurrence: payload.recurrence || "NONE",
  };
}

export function serializeStudentObjective(objective: StudentObjectiveRecord) {
  return {
    id: objective.id,
    studentId: objective.studentId,
    title: decodeStoredText(objective.title),
    description: objective.description ? decodeStoredText(objective.description) : "",
    startAt: objective.startAt.toISOString(),
    endAt: objective.endAt.toISOString(),
    status: objective.status,
    statusLabel: getLabel(STUDENT_OBJECTIVE_STATUSES, objective.status),
    objectiveType: objective.objectiveType || "",
    objectiveTypeLabel: getLabel(STUDENT_OBJECTIVE_TYPES, objective.objectiveType),
    focusContentTitle: objective.focusContentTitle ? decodeStoredText(objective.focusContentTitle) : "",
    focusContentUrl: objective.focusContentUrl ? decodeStoredText(objective.focusContentUrl) : "",
    focusContentType: objective.focusContentType || "",
    focusContentTypeLabel: getLabel(FOCUS_CONTENT_TYPES, objective.focusContentType),
    recurrence: objective.recurrence || "NONE",
    recurrenceLabel: getLabel(STUDENT_OBJECTIVE_RECURRENCES, objective.recurrence || "NONE"),
    recurrenceSourceId: objective.recurrenceSourceId || null,
    recurrenceCreatedAt: objective.recurrenceCreatedAt?.toISOString() || null,
    completedAt: objective.completedAt?.toISOString() || null,
    createdAt: objective.createdAt.toISOString(),
    updatedAt: objective.updatedAt.toISOString(),
  };
}

export function sortStudentObjectives<T extends { status: string; endAt: string | Date; updatedAt?: string | Date }>(
  objectives: T[],
): T[] {
  return [...objectives].sort((left, right) => {
    if (left.status !== right.status) return left.status === "IN_PROGRESS" ? -1 : 1;
    const leftEnd = new Date(left.endAt).getTime();
    const rightEnd = new Date(right.endAt).getTime();
    if (leftEnd !== rightEnd) return leftEnd - rightEnd;
    return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
  });
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(date: Date) {
  const start = startOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

function endOfWeek(date: Date) {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 7);
  return end;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function dateKey(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getObjectiveDueState(objective: Pick<StudentObjectiveRecord, "status" | "endAt">, now = new Date()) {
  if (objective.status === "COMPLETED") return "completed" as const;
  const msUntilEnd = objective.endAt.getTime() - now.getTime();
  if (msUntilEnd < 0) return "overdue" as const;
  if (msUntilEnd <= 24 * 60 * 60 * 1000) return "dueSoon" as const;
  return "normal" as const;
}

export function addRecurrenceInterval(date: Date, recurrence: StudentObjectiveRecurrenceValue) {
  const next = new Date(date);
  if (recurrence === "DAILY") next.setDate(next.getDate() + 1);
  if (recurrence === "WEEKLY") next.setDate(next.getDate() + 7);
  if (recurrence === "MONTHLY") next.setMonth(next.getMonth() + 1);
  return next;
}

export function buildNextRecurringObjectiveData(objective: StudentObjectiveRecord, completedAt = new Date()) {
  const recurrence = objective.recurrence || "NONE";
  if (recurrence === "NONE") return null;
  const nextStartAt = addRecurrenceInterval(objective.startAt, recurrence);
  const nextEndAt = addRecurrenceInterval(objective.endAt, recurrence);
  return {
    studentId: objective.studentId,
    title: objective.title,
    description: objective.description || null,
    startAt: nextStartAt,
    endAt: nextEndAt,
    status: "IN_PROGRESS" as StudentObjectiveStatusValue,
    objectiveType: objective.objectiveType || null,
    focusContentTitle: objective.focusContentTitle || null,
    focusContentUrl: objective.focusContentUrl || null,
    focusContentType: objective.focusContentType || null,
    recurrence,
    recurrenceSourceId: objective.recurrenceSourceId || objective.id,
    recurrenceCreatedAt: completedAt,
    completedAt: null,
  };
}

export function buildStudentObjectiveSummary(objectives: StudentObjectiveRecord[], now = new Date()) {
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const serialized = objectives.map(serializeStudentObjective);
  const totalCreated = objectives.length;
  const totalCompleted = objectives.filter((objective) => objective.status === "COMPLETED").length;
  const overdueObjectives = objectives.filter((objective) => getObjectiveDueState(objective, now) === "overdue");
  const dueSoonObjectives = objectives.filter((objective) => getObjectiveDueState(objective, now) === "dueSoon");
  const weeklyCreated = objectives.filter(
    (objective) => objective.createdAt >= weekStart && objective.createdAt < weekEnd,
  );
  const weeklyCompleted = objectives.filter(
    (objective) => objective.completedAt && objective.completedAt >= weekStart && objective.completedAt < weekEnd,
  );
  const successRate = totalCreated === 0 ? 0 : clampPercent((totalCompleted / totalCreated) * 100);
  const weeklyCompletionRate =
    weeklyCreated.length === 0 ? 0 : clampPercent((weeklyCompleted.length / weeklyCreated.length) * 100);

  const completedDays = new Set(
    objectives.filter((objective) => objective.completedAt).map((objective) => dateKey(objective.completedAt!)),
  );
  let streakDays = 0;
  const cursor = startOfDay(now);
  while (completedDays.has(dateKey(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const calendarDays = [];
  const calendarCursor = new Date(monthStart);
  while (calendarCursor < monthEnd) {
    const currentKey = dateKey(calendarCursor);
    const dayObjectives = objectives.filter((objective) => dateKey(objective.endAt) === currentKey);
    const completedCount = dayObjectives.filter((objective) => objective.status === "COMPLETED").length;
    const overdueCount = dayObjectives.filter((objective) => getObjectiveDueState(objective, now) === "overdue").length;
    const dueSoonCount = dayObjectives.filter((objective) => getObjectiveDueState(objective, now) === "dueSoon").length;
    calendarDays.push({
      date: currentKey,
      dayOfMonth: calendarCursor.getDate(),
      objectiveCount: dayObjectives.length,
      completedCount,
      overdueCount,
      dueSoonCount,
      objectives: dayObjectives.slice(0, 3).map(serializeStudentObjective),
    });
    calendarCursor.setDate(calendarCursor.getDate() + 1);
  }

  return {
    generatedAt: now.toISOString(),
    weeklyProgress: {
      startAt: weekStart.toISOString(),
      endAt: weekEnd.toISOString(),
      created: weeklyCreated.length,
      completed: weeklyCompleted.length,
      percent: weeklyCompletionRate,
    },
    stats: {
      totalCreated,
      totalCompleted,
      overdue: overdueObjectives.length,
      successRate,
    },
    streak: {
      days: streakDays,
      completedDays: [...completedDays].sort(),
    },
    dueSoonObjectives: sortStudentObjectives(dueSoonObjectives).map(serializeStudentObjective),
    overdueObjectives: sortStudentObjectives(overdueObjectives).map(serializeStudentObjective),
    calendar: {
      month: monthStart.toISOString().slice(0, 7),
      days: calendarDays,
    },
    objectives: serialized,
  };
}
