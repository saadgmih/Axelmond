import { useCallback } from "react";
import { api } from "../api";
import type { ScheduleSessionPayload, ScheduleSessionTypeValue } from "../schedule";
import { SCHEDULE_DAYS, sortScheduleSessions } from "../schedule";
import { useScheduleSessions } from "./useScheduleSessions";

export interface ScheduleSessionView {
  id: string;
  professorId: string;
  dayOfWeek: number;
  dayLabel: string;
  title: string;
  moduleName: string;
  startTime: string;
  endTime: string;
  sessionType: ScheduleSessionTypeValue;
  sessionTypeLabel: string;
  roomOrLink: string;
  description: string;
}

export const emptyScheduleForm: ScheduleSessionPayload = {
  dayOfWeek: 0,
  title: "",
  moduleName: "",
  startTime: "08:00",
  endTime: "10:00",
  sessionType: "COURS",
  roomOrLink: "",
  description: "",
};

export interface UseTeacherScheduleOptions {
  role: string;
  teacherView: string;
}

export function useTeacherSchedule({ role, teacherView }: UseTeacherScheduleOptions) {
  const fetchSessions = useCallback(() => api.getSchedule(), []);
  const createSession = useCallback((payload: ScheduleSessionPayload) => api.createScheduleSession(payload), []);
  const updateSession = useCallback(
    (sessionId: string, payload: ScheduleSessionPayload) => api.updateScheduleSession(sessionId, payload),
    [],
  );
  const deleteSession = useCallback((sessionId: string) => api.deleteScheduleSession(sessionId), []);

  return useScheduleSessions<ScheduleSessionView, ScheduleSessionPayload>({
    shouldLoad: role === "teacher" && teacherView === "schedule",
    emptyForm: emptyScheduleForm,
    loadErrorMessage: "Impossible de charger l'emploi du temps",
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    sortSessions: sortScheduleSessions,
    scheduleDays: SCHEDULE_DAYS,
  });
}
