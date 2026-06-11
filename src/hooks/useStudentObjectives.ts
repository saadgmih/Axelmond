import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import {
  sortStudentObjectives,
  type FocusContentTypeValue,
  type StudentObjectiveStatusValue,
  type StudentObjectiveTypeValue,
} from "../student-objectives";

export interface StudentObjectiveView {
  id: string;
  studentId: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  status: StudentObjectiveStatusValue;
  statusLabel: string;
  objectiveType: StudentObjectiveTypeValue | "";
  objectiveTypeLabel: string;
  focusContentTitle: string;
  focusContentUrl: string;
  focusContentType: FocusContentTypeValue | "";
  focusContentTypeLabel: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentObjectiveFormState {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  status: StudentObjectiveStatusValue;
  objectiveType: StudentObjectiveTypeValue | "";
  focusContentTitle: string;
  focusContentUrl: string;
  focusContentType: FocusContentTypeValue | "";
}

export interface UseStudentObjectivesOptions {
  role: string;
  currentView: string;
}

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function defaultObjectiveForm(): StudentObjectiveFormState {
  const now = new Date();
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return {
    title: "",
    description: "",
    startAt: toDateTimeLocalValue(now),
    endAt: toDateTimeLocalValue(end),
    status: "IN_PROGRESS",
    objectiveType: "",
    focusContentTitle: "",
    focusContentUrl: "",
    focusContentType: "",
  };
}

function toApiPayload(form: StudentObjectiveFormState) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    startAt: new Date(form.startAt).toISOString(),
    endAt: new Date(form.endAt).toISOString(),
    status: form.status,
    objectiveType: form.objectiveType || undefined,
    focusContentTitle: form.focusContentTitle.trim() || undefined,
    focusContentUrl: form.focusContentUrl.trim() || undefined,
    focusContentType: form.focusContentType || undefined,
  };
}

function toFormState(objective: StudentObjectiveView): StudentObjectiveFormState {
  return {
    title: objective.title,
    description: objective.description,
    startAt: toDateTimeLocalValue(new Date(objective.startAt)),
    endAt: toDateTimeLocalValue(new Date(objective.endAt)),
    status: objective.status,
    objectiveType: objective.objectiveType,
    focusContentTitle: objective.focusContentTitle,
    focusContentUrl: objective.focusContentUrl,
    focusContentType: objective.focusContentType,
  };
}

export function useStudentObjectives({ role, currentView }: UseStudentObjectivesOptions) {
  const [objectives, setObjectives] = useState<StudentObjectiveView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentObjectiveFormState>(() => defaultObjectiveForm());
  const [isSaving, setIsSaving] = useState(false);

  const loadObjectives = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await api.getStudentObjectives();
      setObjectives(sortStudentObjectives(Array.isArray(data) ? data : []));
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible de charger vos objectifs");
      setObjectives([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === "student" && currentView === "objectives") {
      loadObjectives();
    }
  }, [role, currentView, loadObjectives]);

  const inProgressObjectives = useMemo(
    () => sortStudentObjectives(objectives.filter((objective) => objective.status !== "COMPLETED")),
    [objectives],
  );

  const completedObjectives = useMemo(
    () => sortStudentObjectives(objectives.filter((objective) => objective.status === "COMPLETED")),
    [objectives],
  );

  const openCreateForm = useCallback(() => {
    setEditingObjectiveId(null);
    setForm(defaultObjectiveForm());
    setStatusMsg("");
    setErrorMsg("");
    setIsFormOpen(true);
  }, []);

  const openEditForm = useCallback((objective: StudentObjectiveView) => {
    setEditingObjectiveId(objective.id);
    setForm(toFormState(objective));
    setStatusMsg("");
    setErrorMsg("");
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingObjectiveId(null);
    setForm(defaultObjectiveForm());
  }, []);

  const handleSaveObjective = useCallback(async () => {
    setIsSaving(true);
    setStatusMsg("");
    setErrorMsg("");
    try {
      const payload = toApiPayload(form);
      const saved = editingObjectiveId
        ? await api.updateStudentObjective(editingObjectiveId, payload)
        : await api.createStudentObjective(payload);

      setObjectives((current) => {
        const next = editingObjectiveId
          ? current.map((objective) => (objective.id === editingObjectiveId ? saved : objective))
          : [...current, saved];
        return sortStudentObjectives(next);
      });
      setStatusMsg(editingObjectiveId ? "Objectif modifié avec succès" : "Objectif ajouté avec succès");
      closeForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Enregistrement impossible");
    } finally {
      setIsSaving(false);
    }
  }, [closeForm, editingObjectiveId, form]);

  const handleCompleteObjective = useCallback(async (objectiveId: string) => {
    setStatusMsg("");
    setErrorMsg("");
    try {
      const updated = await api.completeStudentObjective(objectiveId);
      setObjectives((current) => sortStudentObjectives(current.map((objective) => (
        objective.id === objectiveId ? updated : objective
      ))));
      setStatusMsg("Objectif marqué comme terminé");
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible de terminer cet objectif");
    }
  }, []);

  const handleDeleteObjective = useCallback(async (objectiveId: string) => {
    setStatusMsg("");
    setErrorMsg("");
    try {
      await api.deleteStudentObjective(objectiveId);
      setObjectives((current) => current.filter((objective) => objective.id !== objectiveId));
      setStatusMsg("Objectif supprimé");
      if (editingObjectiveId === objectiveId) closeForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Suppression impossible");
    }
  }, [closeForm, editingObjectiveId]);

  return {
    objectives,
    inProgressObjectives,
    completedObjectives,
    isLoading,
    statusMsg,
    errorMsg,
    isFormOpen,
    editingObjectiveId,
    form,
    setForm,
    isSaving,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSaveObjective,
    handleCompleteObjective,
    handleDeleteObjective,
  };
}
