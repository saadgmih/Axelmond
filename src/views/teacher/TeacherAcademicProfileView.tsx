import { useMemo } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  BookOpen,
  ExternalLink,
  Globe,
  GraduationCap,
  Link2,
  Lock,
  RefreshCw,
  Shield,
  User,
  Video,
} from "lucide-react";
import ProfileAvatarUpload from "../../components/ProfileAvatarUpload";
import type { AppUser } from "../../components/AuthScreen";
import { getRoleLabel, type UserRole } from "../../rbac";
import type { AcademicProfilePayload } from "../../types";

type AcademicProfileFormState = {
  title: string;
  department: string;
  lab: string;
  speciality: string;
  teachingDomains: string;
  researchDomains: string;
  bio: string;
  avatarUrl: string;
  linkedIn: string;
  orcid: string;
  googleScholar: string;
  website: string;
};

type AcademicPasswordFormState = {
  currentPassword: string;
  newPassword: string;
};

interface TeacherAcademicProfileViewProps {
  currentUser: AppUser;
  academicProfileData: AcademicProfilePayload | null;
  academicProfileForm: AcademicProfileFormState;
  setAcademicProfileForm: Dispatch<SetStateAction<AcademicProfileFormState>>;
  academicProfileStatusMsg: string;
  academicProfileErrorMsg: string;
  refreshAcademicProfile: () => void | Promise<void>;
  handleUpdateAcademicProfile: (e: FormEvent) => void | Promise<void>;
  handleUploadAvatarFile: (file: File) => void | Promise<void>;
  handleUpdateAcademicAvatar: (e: FormEvent) => void | Promise<void>;
  handleDeleteAvatar: () => void | Promise<void>;
  avatarStatusMsg: string;
  academicPasswordForm: AcademicPasswordFormState;
  setAcademicPasswordForm: Dispatch<SetStateAction<AcademicPasswordFormState>>;
  handleChangeAcademicPassword: (e: FormEvent) => void | Promise<void>;
}

type RoleTheme = {
  hero: string;
  badge: string;
  badgeText: string;
  accent: string;
  accentHover: string;
  ring: string;
  icon: typeof GraduationCap;
  subtitle: string;
  uploadAccent: "pink" | "violet" | "teal";
};

function getRoleTheme(role: UserRole): RoleTheme {
  if (role === "ADMIN") {
    return {
      hero: "from-violet-950 via-purple-900 to-slate-900",
      badge: "border-violet-400/30 bg-violet-500/20",
      badgeText: "text-violet-200",
      accent: "bg-violet-600",
      accentHover: "hover:bg-violet-700",
      ring: "ring-violet-500/20",
      icon: Shield,
      subtitle: "Administration de la plateforme Axelmond",
      uploadAccent: "violet",
    };
  }
  if (role === "RESEARCHER") {
    return {
      hero: "from-teal-950 via-cyan-900 to-slate-900",
      badge: "border-teal-400/30 bg-teal-500/20",
      badgeText: "text-teal-200",
      accent: "bg-teal-600",
      accentHover: "hover:bg-teal-700",
      ring: "ring-teal-500/20",
      icon: GraduationCap,
      subtitle: "Profil chercheur et publications",
      uploadAccent: "teal",
    };
  }
  return {
    hero: "from-pink-950 via-rose-900 to-slate-900",
    badge: "border-pink-400/30 bg-pink-500/20",
    badgeText: "text-pink-200",
    accent: "bg-pink-600",
    accentHover: "hover:bg-pink-700",
    ring: "ring-pink-500/20",
    icon: GraduationCap,
    subtitle: "Identité académique et enseignement",
    uploadAccent: "pink",
  };
}

function getInitials(name: string) {
  if (!name) return "UN";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-offset-1";
const labelClass = "text-[10px] font-black uppercase tracking-widest text-slate-400";

export default function TeacherAcademicProfileView({
  currentUser,
  academicProfileData,
  academicProfileForm,
  setAcademicProfileForm,
  academicProfileStatusMsg,
  academicProfileErrorMsg,
  refreshAcademicProfile,
  handleUpdateAcademicProfile,
  handleUploadAvatarFile,
  handleUpdateAcademicAvatar,
  handleDeleteAvatar,
  avatarStatusMsg,
  academicPasswordForm,
  setAcademicPasswordForm,
  handleChangeAcademicPassword,
}: TeacherAcademicProfileViewProps) {
  const role = (academicProfileData?.user.role || currentUser.role) as UserRole;
  const theme = useMemo(() => getRoleTheme(role), [role]);
  const RoleIcon = theme.icon;
  const displayName = academicProfileData?.user.fullName || currentUser.fullName;
  const displayEmail = academicProfileData?.user.email || currentUser.email;
  const roleLabel = getRoleLabel(role);

  const focusRing =
    role === "ADMIN" ? "focus:ring-violet-500" : role === "RESEARCHER" ? "focus:ring-teal-500" : "focus:ring-pink-500";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.hero} text-white shadow-xl border border-white/5`}>
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
              <div className={`relative shrink-0 overflow-hidden rounded-2xl border-4 border-white/20 shadow-2xl ring-4 ${theme.ring}`}>
                {academicProfileForm.avatarUrl || currentUser.avatarUrl ? (
                  <img
                    src={academicProfileForm.avatarUrl || currentUser.avatarUrl}
                    alt="Photo de profil"
                    className="h-28 w-28 object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center bg-slate-900 text-3xl font-black">
                    {getInitials(displayName)}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${theme.badge} ${theme.badgeText}`}>
                  <RoleIcon className="h-3 w-3" />
                  {roleLabel}
                </span>
                <h1 className="text-2xl font-black tracking-tight md:text-3xl">{displayName}</h1>
                <p className="text-sm font-medium text-white/70">
                  {academicProfileForm.title || currentUser.levelOrTitle || "Profil académique"}
                </p>
                <p className="text-xs text-white/50">{theme.subtitle}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={refreshAcademicProfile}
              className="inline-flex items-center justify-center gap-2 self-center rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20 lg:self-auto"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {(academicProfileStatusMsg || academicProfileErrorMsg) && (
        <div
          className={`rounded-2xl border px-5 py-4 text-xs font-semibold ${
            academicProfileErrorMsg
              ? "border-red-100 bg-red-50 text-red-800"
              : "border-emerald-100 bg-emerald-50 text-emerald-800"
          }`}
        >
          {academicProfileErrorMsg || academicProfileStatusMsg}
        </div>
      )}

      {role === "ADMIN" && (
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-violet-600 p-2.5 text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-violet-900">Espace administrateur</h3>
              <p className="mt-1 text-xs leading-relaxed text-violet-700/80">
                Votre profil académique est partagé avec les enseignants. Utilisez le tableau de bord pour la
                configuration SMTP, la gestion des modules et les diagnostics système.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        {/* Main form */}
        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5 md:px-8">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <User className="h-5 w-5 text-slate-400" />
                Identité du compte
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">Informations verrouillées — modifiables par l'administration</p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3 md:p-8">
              {[
                { label: "Nom complet", value: displayName },
                { label: "Email", value: displayEmail },
                { label: "Rôle", value: roleLabel },
              ].map((field) => (
                <label key={field.label} className="space-y-1.5">
                  <span className={labelClass}>{field.label}</span>
                  <input value={field.value} readOnly className={`${inputClass} cursor-not-allowed bg-slate-100 font-bold text-slate-500`} />
                </label>
              ))}
            </div>
          </section>

          <form onSubmit={handleUpdateAcademicProfile} className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5 md:px-8">
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <GraduationCap className="h-5 w-5 text-slate-400" />
                  Informations académiques
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 md:p-8">
                {[
                  { key: "title" as const, placeholder: "Titre académique (ex. Professeur associé)" },
                  { key: "department" as const, placeholder: "Département" },
                  { key: "lab" as const, placeholder: "Chaire / laboratoire" },
                  { key: "speciality" as const, placeholder: "Spécialité" },
                ].map((field) => (
                  <input
                    key={field.key}
                    placeholder={field.placeholder}
                    value={academicProfileForm[field.key]}
                    onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className={`${inputClass} ${focusRing}`}
                  />
                ))}

                <textarea
                  rows={3}
                  placeholder="Domaines d'enseignement (séparés par des virgules)"
                  value={academicProfileForm.teachingDomains}
                  onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, teachingDomains: e.target.value }))}
                  className={`${inputClass} ${focusRing}`}
                />
                <textarea
                  rows={3}
                  placeholder="Domaines de recherche (séparés par des virgules)"
                  value={academicProfileForm.researchDomains}
                  onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, researchDomains: e.target.value }))}
                  className={`${inputClass} ${focusRing}`}
                />
                <textarea
                  rows={4}
                  placeholder="Biographie courte"
                  value={academicProfileForm.bio}
                  onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                  className={`md:col-span-2 ${inputClass} ${focusRing}`}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5 md:px-8">
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <Link2 className="h-5 w-5 text-slate-400" />
                  Liens & présence en ligne
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 md:p-8">
                {[
                  { key: "linkedIn" as const, placeholder: "LinkedIn", icon: ExternalLink },
                  { key: "orcid" as const, placeholder: "ORCID", icon: ExternalLink },
                  { key: "googleScholar" as const, placeholder: "Google Scholar", icon: ExternalLink },
                  { key: "website" as const, placeholder: "Site personnel", icon: Globe },
                ].map((field) => (
                  <div key={field.key} className="relative">
                    <field.icon className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      placeholder={field.placeholder}
                      value={academicProfileForm[field.key]}
                      onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className={`${inputClass} pl-10 ${focusRing}`}
                    />
                  </div>
                ))}
              </div>
            </section>

            <button
              type="submit"
              className={`w-full rounded-xl py-3.5 text-xs font-bold text-white shadow-sm transition-colors ${theme.accent} ${theme.accentHover}`}
            >
              Enregistrer le profil
            </button>
          </form>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Avatar */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h3 className="text-sm font-black text-slate-900">Photo de profil</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">Recadrez la zone visible comme sur WhatsApp</p>
            </div>
            <div className="p-6">
              <ProfileAvatarUpload
                avatarUrl={academicProfileForm.avatarUrl || currentUser.avatarUrl}
                initials={getInitials(displayName)}
                statusMsg={avatarStatusMsg}
                accent={theme.uploadAccent}
                onUpload={handleUploadAvatarFile}
                onDelete={handleDeleteAvatar}
              />

              <form onSubmit={handleUpdateAcademicAvatar} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <input
                  placeholder="URL de la photo"
                  value={academicProfileForm.avatarUrl}
                  onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                  className={`${inputClass} ${focusRing}`}
                />
                <button type="submit" className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white transition-colors hover:bg-slate-800">
                  Utiliser cette URL
                </button>
              </form>
            </div>
          </section>

          {/* Password */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Lock className="h-4 w-4 text-slate-400" />
                Sécurité
              </h3>
            </div>
            <form onSubmit={handleChangeAcademicPassword} className="space-y-3 p-6">
              <input
                type="password"
                placeholder="Mot de passe actuel"
                value={academicPasswordForm.currentPassword}
                onChange={(e) => setAcademicPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                className={`${inputClass} ${focusRing}`}
              />
              <input
                type="password"
                placeholder="Nouveau mot de passe"
                value={academicPasswordForm.newPassword}
                onChange={(e) => setAcademicPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                className={`${inputClass} ${focusRing}`}
              />
              <button type="submit" className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white transition-colors hover:bg-indigo-700">
                Mettre à jour le mot de passe
              </button>
            </form>
          </section>

          {/* Activity */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h3 className="text-sm font-black text-slate-900">Activité</h3>
            </div>
            <div className="space-y-5 p-6">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Modules", value: academicProfileData?.courses.length || 0, icon: BookOpen },
                  { label: "Lives", value: academicProfileData?.lives.length || 0, icon: Video },
                  { label: "Publiés", value: academicProfileData?.publishedContentsCount || 0, icon: GraduationCap },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                    <stat.icon className="mx-auto h-3.5 w-3.5 text-slate-400" />
                    <p className="mt-1 text-xl font-black text-slate-900">{stat.value}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className={labelClass}>Modules récents</p>
                {(academicProfileData?.courses || []).slice(0, 4).map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs"
                  >
                    <span className="truncate font-bold text-slate-700">{course.title}</span>
                    <span className={`shrink-0 font-black ${course.published ? "text-emerald-600" : "text-slate-400"}`}>
                      {course.published ? "Publié" : "Brouillon"}
                    </span>
                  </div>
                ))}
                {(academicProfileData?.courses || []).length === 0 && (
                  <p className="text-xs text-slate-400">Aucun module associé.</p>
                )}
              </div>

              <div className="space-y-2">
                <p className={labelClass}>Lives récents</p>
                {(academicProfileData?.lives || []).slice(0, 3).map((live) => (
                  <div key={live.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs">
                    <p className="truncate font-bold text-slate-700">
                      {live.course?.title || `Module ${live.courseId}`}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {live.active ? "En direct" : "Terminé"} ·{" "}
                      {new Date(live.startedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                ))}
                {(academicProfileData?.lives || []).length === 0 && (
                  <p className="text-xs text-slate-400">Aucun live organisé.</p>
                )}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
