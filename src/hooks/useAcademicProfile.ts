import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getClientErrorMessage, isMfaSetupRequiredError } from "../client-errors";
import { api } from "../api";
import type { AppUser } from "../components/AuthScreen";
import type { AcademicProfilePayload } from "../types";
import { useAsyncEffectGuard } from "./useAsyncEffectGuard";

export interface UseAcademicProfileOptions {
  role: string;
  teacherView: string;
  currentUser: AppUser | null;
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

export function useAcademicProfile({ role, teacherView, currentUser }: UseAcademicProfileOptions) {
  const [academicProfileData, setAcademicProfileData] = useState<AcademicProfilePayload | null>(null);
  const [academicProfileForm, setAcademicProfileForm] = useState(emptyAcademicProfileForm);
  const [academicProfileStatusMsg, setAcademicProfileStatusMsg] = useState("");
  const [academicProfileErrorMsg, setAcademicProfileErrorMsg] = useState("");
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
    value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

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
      if (isMfaSetupRequiredError(err)) {
        setAcademicProfileErrorMsg("");
      } else {
        setAcademicProfileErrorMsg(getClientErrorMessage(err, "Profil académique indisponible."));
      }
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
      if (isMfaSetupRequiredError(err)) {
        setAcademicProfileErrorMsg("");
      } else {
        setAcademicProfileErrorMsg(getClientErrorMessage(err, "Mise à jour du profil impossible."));
      }
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
  };
}
