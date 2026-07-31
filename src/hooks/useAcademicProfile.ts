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
  fullName: "",
  phone: "",
  birthDate: "",
  country: "",
  city: "",
  preferredLanguage: "",
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
    const user = payload.user as Record<string, any>;
    setAcademicProfileForm({
      fullName: user?.fullName || currentUser?.fullName || "",
      phone: user?.phone || currentUser?.phone || "",
      birthDate: user?.birthDate || currentUser?.birthDate || "",
      country: user?.country || currentUser?.country || "",
      city: user?.city || currentUser?.city || "",
      preferredLanguage: user?.preferredLanguage || currentUser?.preferredLanguage || "",
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
        fullName: academicProfileForm.fullName,
        phone: academicProfileForm.phone,
        birthDate: academicProfileForm.birthDate,
        country: academicProfileForm.country,
        city: academicProfileForm.city,
        preferredLanguage: academicProfileForm.preferredLanguage,
        title: academicProfileForm.title,
        department: academicProfileForm.department,
        lab: academicProfileForm.lab,
        speciality: academicProfileForm.speciality,
        teachingDomains: parseAcademicDomains(academicProfileForm.teachingDomains),
        researchDomains: parseAcademicDomains(academicProfileForm.researchDomains),
        bio: academicProfileForm.bio,
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
