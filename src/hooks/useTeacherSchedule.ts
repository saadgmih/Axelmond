import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientErrorMessage } from "../client-errors";
import { api } from "../api";
import type { ScheduleSessionPayload, ScheduleSessionTypeValue } from "../schedule";
import { SCHEDULE_DAYS, sortScheduleSessions } from "../schedule";

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
  const [sessions, setSessions] = useState<ScheduleSessionView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleSessionPayload>(emptyScheduleForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await api.getSchedule();
      setSessions(sortScheduleSessions(Array.isArray(data) ? data : []));
    } catch (err: any) {
      setErrorMsg(getClientErrorMessage(err, "Impossible de charger l'emploi du temps"));
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === "teacher" && teacherView === "schedule") {
      loadSessions();
    }
  }, [role, teacherView, loadSessions]);

  const sessionsByDay = useMemo(() => {
    const grouped = new Map<number, ScheduleSessionView[]>();
    for (const day of SCHEDULE_DAYS) grouped.set(day.value, []);
    for (const session of sessions) {
      const bucket = grouped.get(session.dayOfWeek) || [];
      bucket.push(session);
      grouped.set(session.dayOfWeek, bucket);
    }
    for (const [day, daySessions] of grouped.entries()) {
      grouped.set(day, sortScheduleSessions(daySessions));
    }
    return grouped;
  }, [sessions]);

  const openCreateForm = useCallback((dayOfWeek = 0) => {
    setEditingSessionId(null);
    setForm({ ...emptyScheduleForm, dayOfWeek });
    setStatusMsg("");
    setErrorMsg("");
    setIsFormOpen(true);
  }, []);

  const openEditForm = useCallback((session: ScheduleSessionView) => {
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
    setForm(emptyScheduleForm);
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
        ? await api.updateScheduleSession(editingSessionId, payload)
        : await api.createScheduleSession(payload);
      setSessions((current) => {
        const next = editingSessionId
          ? current.map((session) => (session.id === editingSessionId ? saved : session))
          : [...current, saved];
        return sortScheduleSessions(next);
      });
      setStatusMsg(editingSessionId ? "Séance modifiée avec succès" : "Séance ajoutée avec succès");
      closeForm();
    } catch (err: any) {
      setErrorMsg(getClientErrorMessage(err, "Enregistrement impossible"));
    } finally {
      setIsSaving(false);
    }
  }, [closeForm, editingSessionId, form]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    setStatusMsg("");
    setErrorMsg("");
    try {
      await api.deleteScheduleSession(sessionId);
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      setStatusMsg("Séance supprimée");
      if (editingSessionId === sessionId) closeForm();
    } catch (err: any) {
      setErrorMsg(getClientErrorMessage(err, "Suppression impossible"));
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
    reloadSchedule: loadSessions,
  };
}
