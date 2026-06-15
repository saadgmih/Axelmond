import { dateToScheduleDayOfWeek, formatDateKey, formatTimeShort } from "../../../components/calendar/calendar-utils";
import type { StudentObjectiveView } from "../../../hooks/useStudentObjectives";
import type { StudentStudySessionView } from "../../../hooks/useStudentStudySchedule";

export type StudyPlanTab = "calendar" | "sessions" | "objectives" | "stats";

export const STUDY_PLAN_TABS: Array<{ id: StudyPlanTab; label: string }> = [
  { id: "calendar", label: "Calendrier" },
  { id: "sessions", label: "Séances" },
  { id: "objectives", label: "Objectifs" },
  { id: "stats", label: "Statistiques" },
];

export function isStudyPlanView(currentView: string) {
  return currentView === "study-plan" || currentView === "study-schedule" || currentView === "objectives";
}

export function studyPlanTabFromLegacyView(currentView: string): StudyPlanTab | null {
  if (currentView === "study-schedule") return "sessions";
  if (currentView === "objectives") return "objectives";
  return null;
}

export function parseStudyPlanTabFromSearch(search: string): StudyPlanTab | null {
  const value = new URLSearchParams(search).get("tab");
  if (value === "calendar" || value === "sessions" || value === "objectives" || value === "stats") {
    return value;
  }
  return null;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function toStudySessionCalendarMarkers(sessions: StudentStudySessionView[]) {
  return sessions.map((session) => ({
    id: `session-${session.id}`,
    title: session.title,
    startTime: session.startTime,
    endTime: session.endTime,
    dayOfWeek: session.dayOfWeek,
    moduleName: session.moduleName,
    sessionTypeLabel: session.sessionTypeLabel,
  }));
}

export function toObjectiveCalendarMarkers(objectives: StudentObjectiveView[]) {
  return objectives.map((objective) => {
    const endAt = new Date(objective.endAt);
    const startAt = new Date(objective.startAt);
    return {
      id: `objective-${objective.id}`,
      title: objective.title,
      startTime: formatTimeShort(startAt),
      endTime: formatTimeShort(endAt),
      dayOfWeek: dateToScheduleDayOfWeek(endAt),
      occursOnDate: formatDateKey(endAt),
      moduleName: objective.objectiveTypeLabel || undefined,
      sessionTypeLabel: objective.statusLabel,
    };
  });
}

export function parseStudyPlanMarkerId(markerId: string): { kind: "session" | "objective"; id: string } | null {
  if (markerId.startsWith("session-")) return { kind: "session", id: markerId.slice("session-".length) };
  if (markerId.startsWith("objective-")) return { kind: "objective", id: markerId.slice("objective-".length) };
  return null;
}
