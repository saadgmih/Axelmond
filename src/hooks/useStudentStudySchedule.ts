import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { StudentStudySessionPayload, StudentStudySessionTypeValue } from "../student-study-schedule";
import { SCHEDULE_DAYS, sortStudentStudySessions } from "../student-study-schedule";

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
  const [sessions, setSessions] = useState<StudentStudySessionView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentStudySessionPayload>(emptyStudentStudyForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await api.getStudySchedule();
      setSessions(sortStudentStudySessions(Array.isArray(data) ? data : []));
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible de charger votre emploi du temps d'étude");
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === "student" && currentView === "study-schedule") {
      loadSessions();
    }
  }, [role, currentView, loadSessions]);

  const sessionsByDay = useMemo(() => {
    const grouped = new Map<number, StudentStudySessionView[]>();
    for (const day of SCHEDULE_DAYS) grouped.set(day.value, []);
    for (const session of sessions) {
      const bucket = grouped.get(session.dayOfWeek) || [];
      bucket.push(session);
      grouped.set(session.dayOfWeek, bucket);
    }
    for (const [day, daySessions] of grouped.entries()) {
      grouped.set(day, sortStudentStudySessions(daySessions));
    }
    return grouped;
  }, [sessions]);

  const openCreateForm = useCallback((dayOfWeek = 0) => {
    setEditingSessionId(null);
    setForm({ ...emptyStudentStudyForm, dayOfWeek });
    setStatusMsg("");
    setErrorMsg("");
    setIsFormOpen(true);
  }, []);

  const openEditForm = useCallback((session: StudentStudySessionView) => {
    setEditingSessionId(session.id);
    setForm({
      dayOfWeek: session.dayOfWeek,
      title: session.title,
      moduleName: session.moduleName,
      startTime: session.startTime,
      endTime: session.endTime,
      sessionType: session.sessionType,
      roomOrLink: session.roomOrLink,
      description: session.description,
    });
    setStatusMsg("");
    setErrorMsg("");
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingSessionId(null);
    setForm(emptyStudentStudyForm);
  }, []);

  const handleSaveSession = useCallback(async () => {
    setIsSaving(true);
    setStatusMsg("");
    setErrorMsg("");
    try {
      const payload = {
        ...form,
        roomOrLink: form.roomOrLink?.trim() || undefined,
        description: form.description?.trim() || undefined,
      };
      const saved = editingSessionId
        ? await api.updateStudyScheduleSession(editingSessionId, payload)
        : await api.createStudyScheduleSession(payload);
      setSessions((current) => {
        const next = editingSessionId
          ? current.map((session) => (session.id === editingSessionId ? saved : session))
          : [...current, saved];
        return sortStudentStudySessions(next);
      });
      setStatusMsg(editingSessionId ? "Séance modifiée avec succès" : "Séance ajoutée avec succès");
      closeForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Enregistrement impossible");
    } finally {
      setIsSaving(false);
    }
  }, [closeForm, editingSessionId, form]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    setStatusMsg("");
    setErrorMsg("");
    try {
      await api.deleteStudyScheduleSession(sessionId);
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      setStatusMsg("Séance supprimée");
      if (editingSessionId === sessionId) closeForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Suppression impossible");
    }
  }, [closeForm, editingSessionId]);

  return {
    sessions,
    sessionsByDay,
    isLoading,
    statusMsg,
    errorMsg,
    isFormOpen,
    editingSessionId,
    form,
    setForm,
    isSaving,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSaveSession,
    handleDeleteSession,
  };
}
