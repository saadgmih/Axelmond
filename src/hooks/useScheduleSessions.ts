import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientErrorMessage } from "../client-errors";

export interface ScheduleDayOption {
  value: number;
  label: string;
}

export interface ScheduleSessionFormPayload {
  dayOfWeek: number;
  title: string;
  moduleName: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  roomOrLink?: string;
  description?: string;
}

export interface UseScheduleSessionsOptions<
  TSession extends { id: string; dayOfWeek: number },
  TForm extends ScheduleSessionFormPayload,
> {
  shouldLoad: boolean;
  emptyForm: TForm;
  loadErrorMessage: string;
  saveErrorMessage?: string;
  deleteErrorMessage?: string;
  fetchSessions: () => Promise<TSession[]>;
  createSession: (payload: TForm) => Promise<TSession>;
  updateSession: (sessionId: string, payload: TForm) => Promise<TSession>;
  deleteSession: (sessionId: string) => Promise<unknown>;
  sortSessions: (sessions: TSession[]) => TSession[];
  scheduleDays: ReadonlyArray<ScheduleDayOption>;
}

export function useScheduleSessions<
  TSession extends { id: string; dayOfWeek: number },
  TForm extends ScheduleSessionFormPayload,
>({
  shouldLoad,
  emptyForm,
  loadErrorMessage,
  saveErrorMessage = "Enregistrement impossible",
  deleteErrorMessage = "Suppression impossible",
  fetchSessions,
  createSession,
  updateSession,
  deleteSession,
  sortSessions,
  scheduleDays,
}: UseScheduleSessionsOptions<TSession, TForm>) {
  const [sessions, setSessions] = useState<TSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [form, setForm] = useState<TForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await fetchSessions();
      setSessions(sortSessions(Array.isArray(data) ? data : []));
    } catch (err: unknown) {
      setErrorMsg(getClientErrorMessage(err, loadErrorMessage));
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSessions, loadErrorMessage, sortSessions]);

  useEffect(() => {
    if (shouldLoad) {
      loadSessions();
    }
  }, [shouldLoad, loadSessions]);

  const sessionsByDay = useMemo(() => {
    const grouped = new Map<number, TSession[]>();
    for (const day of scheduleDays) grouped.set(day.value, []);
    for (const session of sessions) {
      const bucket = grouped.get(session.dayOfWeek) || [];
      bucket.push(session);
      grouped.set(session.dayOfWeek, bucket);
    }
    for (const [day, daySessions] of grouped.entries()) {
      grouped.set(day, sortSessions(daySessions));
    }
    return grouped;
  }, [scheduleDays, sessions, sortSessions]);

  const openCreateForm = useCallback(
    (dayOfWeek = 0) => {
      setEditingSessionId(null);
      setForm({ ...emptyForm, dayOfWeek } as TForm);
      setStatusMsg("");
      setErrorMsg("");
      setIsFormOpen(true);
    },
    [emptyForm],
  );

  const openEditForm = useCallback((session: TSession & TForm) => {
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
    } as TForm);
    setStatusMsg("");
    setErrorMsg("");
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingSessionId(null);
    setForm(emptyForm);
  }, [emptyForm]);

  const handleSaveSession = useCallback(async () => {
    setIsSaving(true);
    setStatusMsg("");
    setErrorMsg("");
    try {
      const payload = {
        ...form,
        roomOrLink: form.roomOrLink?.trim() || undefined,
        description: form.description?.trim() || undefined,
      } as TForm;
      const saved = editingSessionId ? await updateSession(editingSessionId, payload) : await createSession(payload);
      setSessions((current) => {
        const next = editingSessionId
          ? current.map((session) => (session.id === editingSessionId ? saved : session))
          : [...current, saved];
        return sortSessions(next);
      });
      setStatusMsg(editingSessionId ? "Séance modifiée avec succès" : "Séance ajoutée avec succès");
      closeForm();
    } catch (err: unknown) {
      setErrorMsg(getClientErrorMessage(err, saveErrorMessage));
    } finally {
      setIsSaving(false);
    }
  }, [closeForm, createSession, editingSessionId, form, saveErrorMessage, sortSessions, updateSession]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      setStatusMsg("");
      setErrorMsg("");
      try {
        await deleteSession(sessionId);
        setSessions((current) => current.filter((session) => session.id !== sessionId));
        setStatusMsg("Séance supprimée");
        if (editingSessionId === sessionId) closeForm();
      } catch (err: unknown) {
        setErrorMsg(getClientErrorMessage(err, deleteErrorMessage));
      }
    },
    [closeForm, deleteErrorMessage, deleteSession, editingSessionId],
  );

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
