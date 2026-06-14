import { useCallback } from "react";
import { api } from "../api";
import type { StudentStudySessionPayload, StudentStudySessionTypeValue } from "../student-study-schedule";
import { SCHEDULE_DAYS, sortStudentStudySessions } from "../student-study-schedule";
import { useScheduleSessions } from "./useScheduleSessions";

export interface StudentStudySessionView {
  id: string;
  studentId: string;
  dayOfWeek: number;
  dayLabel: string;
  title: string;
  moduleName: string;
  startTime: string;
  endTime: string;
  sessionType: StudentStudySessionTypeValue;
  sessionTypeLabel: string;
  roomOrLink: string;
  description: string;
}

export const emptyStudentStudyForm: StudentStudySessionPayload = {
  dayOfWeek: 0,
  title: "",
  moduleName: "",
  startTime: "08:00",
  endTime: "10:00",
  sessionType: "REVISION",
  roomOrLink: "",
  description: "",
};

export interface UseStudentStudyScheduleOptions {
  role: string;
  currentView: string;
}

export function useStudentStudySchedule({ role, currentView }: UseStudentStudyScheduleOptions) {
  const fetchSessions = useCallback(() => api.getStudySchedule(), []);
  const createSession = useCallback(
    (payload: StudentStudySessionPayload) => api.createStudyScheduleSession(payload),
    [],
  );
  const updateSession = useCallback(
    (sessionId: string, payload: StudentStudySessionPayload) => api.updateStudyScheduleSession(sessionId, payload),
    [],
  );
  const deleteSession = useCallback((sessionId: string) => api.deleteStudyScheduleSession(sessionId), []);

  return useScheduleSessions<StudentStudySessionView, StudentStudySessionPayload>({
    shouldLoad: role === "student" && currentView === "study-schedule",
    emptyForm: emptyStudentStudyForm,
    loadErrorMessage: "Impossible de charger votre emploi du temps d'étude",
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    sortSessions: sortStudentStudySessions,
    scheduleDays: SCHEDULE_DAYS,
  });
}
