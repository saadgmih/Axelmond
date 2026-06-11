import { decodeStoredText } from "./text";

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

export type StudentObjectiveStatusValue = (typeof STUDENT_OBJECTIVE_STATUSES)[number]["value"];
export type StudentObjectiveTypeValue = (typeof STUDENT_OBJECTIVE_TYPES)[number]["value"];
export type FocusContentTypeValue = (typeof FOCUS_CONTENT_TYPES)[number]["value"];

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
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:";
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
    completedAt: objective.completedAt?.toISOString() || null,
    createdAt: objective.createdAt.toISOString(),
    updatedAt: objective.updatedAt.toISOString(),
  };
}

export function sortStudentObjectives<T extends { status: string; endAt: string | Date; updatedAt?: string | Date }>(objectives: T[]): T[] {
  return [...objectives].sort((left, right) => {
    if (left.status !== right.status) return left.status === "IN_PROGRESS" ? -1 : 1;
    const leftEnd = new Date(left.endAt).getTime();
    const rightEnd = new Date(right.endAt).getTime();
    if (leftEnd !== rightEnd) return leftEnd - rightEnd;
    return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
  });
}
