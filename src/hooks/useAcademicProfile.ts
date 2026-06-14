import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getClientErrorMessage } from "../client-errors";
import { api } from "../api";
import type { AppUser } from "../components/AuthScreen";
import type { AcademicProfilePayload } from "../types";
import { useAsyncEffectGuard } from "./useAsyncEffectGuard";

export interface UseAcademicProfileOptions {
  role: string;
  teacherView: string;
  currentUser: AppUser | null;
  updateSessionUser: (user: AppUser) => void;
}

const emptyAcademicProfileForm = {
  title: "",
  department: "",
  lab: "",
  speciality: "",
  teachingDomains: "",
  researchDomains: "",
  bio: "",
  avatarUrl: "",
  linkedIn: "",
  orcid: "",
  googleScholar: "",
  website: "",
};

export function useAcademicProfile({
  role,
  teacherView,
  currentUser,
  updateSessionUser,
}: UseAcademicProfileOptions) {
  const [academicProfileData, setAcademicProfileData] = useState<AcademicProfilePayload | null>(null);
  const [academicProfileForm, setAcademicProfileForm] = useState(emptyAcademicProfileForm);
  const [academicProfileStatusMsg, setAcademicProfileStatusMsg] = useState("");
  const [academicProfileErrorMsg, setAcademicProfileErrorMsg] = useState("");
  const [academicPasswordForm, setAcademicPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const { startRequest } = useAsyncEffectGuard();

  const hydrateAcademicProfileForm = (payload: AcademicProfilePayload) => {
    const profile = payload.profile;
    setAcademicProfileForm({
      title: profile.title || "",
      department: profile.department || "",
      lab: profile.lab || "",
      speciality: profile.speciality || "",
      teachingDomains: profile.teachingDomains.join(", "),
      researchDomains: profile.researchDomains.join(", "),
      bio: profile.bio || "",
      avatarUrl: profile.avatarUrl || "",
      linkedIn: profile.links?.linkedIn || "",
      orcid: profile.links?.orcid || "",
      googleScholar: profile.links?.googleScholar || "",
      website: profile.links?.website || "",
    });
  };

  const parseAcademicDomains = (value: string) =>
    value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);

  const refreshAcademicProfile = useCallback(async () => {
    if (role !== "teacher") return;
    const request = startRequest();
    setAcademicProfileStatusMsg("Chargement du profil académique...");
    setAcademicProfileErrorMsg("");
    try {
      const payload = await api.getAcademicProfile();
      if (!request.isActive()) return;
      setAcademicProfileData(payload);
      hydrateAcademicProfileForm(payload);
      setAcademicProfileStatusMsg("");
    } catch (err: any) {
      if (!request.isActive()) return;
      setAcademicProfileData(null);
      setAcademicProfileErrorMsg(getClientErrorMessage(err, "Profil académique indisponible."));
      setAcademicProfileStatusMsg("");
    }
  }, [role, startRequest]);

  useEffect(() => {
    if (role !== "teacher" || teacherView !== "academic-profile") return;
    void refreshAcademicProfile();
  }, [role, teacherView, currentUser?.id, refreshAcademicProfile]);

  const handleUpdateAcademicProfile = async (e: FormEvent) => {
    e.preventDefault();
    const request = startRequest();
    setAcademicProfileStatusMsg("Enregistrement du profil académique...");
    setAcademicProfileErrorMsg("");
    try {
      const payload = await api.updateAcademicProfile({
        title: academicProfileForm.title,
        department: academicProfileForm.department,
        lab: academicProfileForm.lab,
        speciality: academicProfileForm.speciality,
        teachingDomains: parseAcademicDomains(academicProfileForm.teachingDomains),
        researchDomains: parseAcademicDomains(academicProfileForm.researchDomains),
        bio: academicProfileForm.bio,
        avatarUrl: academicProfileForm.avatarUrl,
        links: {
          linkedIn: academicProfileForm.linkedIn,
          orcid: academicProfileForm.orcid,
          googleScholar: academicProfileForm.googleScholar,
          website: academicProfileForm.website,
        },
      });
      if (!request.isActive()) return;
      setAcademicProfileData(payload);
      hydrateAcademicProfileForm(payload);
      setAcademicProfileStatusMsg(payload.message || "Profil académique mis à jour.");
    } catch (err: any) {
      if (!request.isActive()) return;
      setAcademicProfileErrorMsg(getClientErrorMessage(err, "Mise à jour du profil impossible."));
      setAcademicProfileStatusMsg("");
    }
  };

  const handleUpdateAcademicAvatar = async (e: FormEvent) => {
    e.preventDefault();
    if (!academicProfileForm.avatarUrl.trim()) {
      setAcademicProfileErrorMsg("URL de photo requise.");
      return;
    }
    const request = startRequest();
    setAcademicProfileStatusMsg("Mise à jour de la photo...");
    setAcademicProfileErrorMsg("");
    try {
      const payload = await api.updateAcademicAvatar(academicProfileForm.avatarUrl.trim());
      if (!request.isActive()) return;
      setAcademicProfileData(payload);
      hydrateAcademicProfileForm(payload);
      if (currentUser) updateSessionUser({ ...currentUser, avatarUrl: academicProfileForm.avatarUrl.trim() });
      setAcademicProfileStatusMsg(payload.message || "Photo de profil mise à jour.");
    } catch (err: any) {
      if (!request.isActive()) return;
      setAcademicProfileErrorMsg(getClientErrorMessage(err, "Mise à jour de la photo impossible."));
      setAcademicProfileStatusMsg("");
    }
  };

  const handleChangeAcademicPassword = async (e: FormEvent) => {
    e.preventDefault();
    const request = startRequest();
    setAcademicProfileStatusMsg("Mise à jour du mot de passe...");
    setAcademicProfileErrorMsg("");
    try {
      const payload = await api.changeAcademicPassword(academicPasswordForm.currentPassword, academicPasswordForm.newPassword);
      if (!request.isActive()) return;
      setAcademicPasswordForm({ currentPassword: "", newPassword: "" });
      setAcademicProfileStatusMsg(payload.message || "Mot de passe mis à jour.");
    } catch (err: any) {
      if (!request.isActive()) return;
      setAcademicProfileErrorMsg(getClientErrorMessage(err, "Changement de mot de passe impossible."));
    e.preventDefault();
    const request = startRequest();
    setAcademicProfileStatusMsg("Mise à jour du mot de passe...");
    setAcademicProfileErrorMsg("");
    try {
      const payload = await api.changeAcademicPassword(academicPasswordForm.currentPassword, academicPasswordForm.newPassword);
      if (!request.isActive()) return;
      setAcademicPasswordForm({ currentPassword: "", newPassword: "" });
      setAcademicProfileStatusMsg(payload.message || "Mot de passe mis à jour.");
    } catch (err: any) {
      if (!request.isActive()) return;
      setAcademicProfileErrorMsg(err.message || "Changement de mot de passe impossible.");
      setAcademicProfileStatusMsg("");
    }
  };

  return {
    academicProfileData,
    academicProfileForm,
    setAcademicProfileForm,
    academicProfileStatusMsg,
    academicProfileErrorMsg,
    refreshAcademicProfile,
    handleUpdateAcademicProfile,
    handleUpdateAcademicAvatar,
    handleChangeAcademicPassword,
    academicPasswordForm,
    setAcademicPasswordForm,
  };
}
