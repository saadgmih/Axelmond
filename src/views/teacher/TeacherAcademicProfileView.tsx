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
import SecuritySettingsPanel from "../../components/SecuritySettingsPanel";
import type { AppUser } from "../../components/AuthScreen";
import { getRoleLabel, type UserRole } from "../../rbac";
import type { AcademicProfilePayload } from "../../types";
import { getProfileRoleTheme, profileUi } from "./academic-profile-theme";

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

function getInitials(name: string) {
  if (!name) return "UN";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

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
  const theme = useMemo(() => getProfileRoleTheme(role), [role]);
  const RoleIcon = theme.icon;
  const displayName = academicProfileData?.user.fullName || currentUser.fullName;
  const displayEmail = academicProfileData?.user.email || currentUser.email;
  const roleLabel = getRoleLabel(role);
  const inputFocus = `${profileUi.input} ${theme.focusRing}`;

  return (
    <div
      className={`${profileUi.page} rounded-2xl border border-white/[0.06] bg-[#020617] p-5 shadow-2xl shadow-black/20 sm:rounded-3xl sm:p-6 md:p-8 2xl:p-10`}
    >
      {/* Hero banner */}
      <div className={profileUi.hero}>
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.heroGradient}`} />
        <div className={profileUi.heroGradient} />
        <div className={profileUi.heroGlowIndigo} />
        <div className={profileUi.heroGlowViolet} />

        <div className={profileUi.heroInner}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
              <div className={`${profileUi.avatarFrame} ${theme.accentRing} ring-2`}>
                {academicProfileForm.avatarUrl || currentUser.avatarUrl ? (
                  <img
                    src={academicProfileForm.avatarUrl || currentUser.avatarUrl}
                    alt="Photo de profil"
                    className={`${profileUi.avatarSize} object-cover`}
                  />
                ) : (
                  <div
                    className={`flex ${profileUi.avatarSize} items-center justify-center bg-gradient-to-br from-indigo-950 to-[#020617] text-2xl font-black text-white`}
                  >
                    {getInitials(displayName)}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm ${theme.badge} ${theme.badgeText}`}
                >
                  <RoleIcon className="h-3.5 w-3.5" />
                  {roleLabel}
                </span>
                <h1 className={profileUi.heroName}>{displayName}</h1>
                <p className={profileUi.heroTitle}>
                  {academicProfileForm.title || currentUser.levelOrTitle || "Profil académique"}
                </p>
                <p className={profileUi.heroSubtitle}>{theme.subtitle}</p>
              </div>
            </div>

            <button type="button" onClick={refreshAcademicProfile} className={profileUi.refreshBtn}>
              <RefreshCw className="h-4 w-4 text-indigo-300" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {(academicProfileStatusMsg || academicProfileErrorMsg) && (
        <div role="alert" className={academicProfileErrorMsg ? profileUi.alertError : profileUi.alertSuccess}>
          {academicProfileErrorMsg || academicProfileStatusMsg}
        </div>
      )}

      {role === "ADMIN" && (
        <div className={profileUi.adminBanner}>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-2.5 text-white shadow-lg shadow-violet-900/40">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-violet-100">Espace administrateur</h3>
              <p className="mt-1 text-xs leading-relaxed text-violet-300/80">
                Votre profil académique est partagé avec les enseignants. Utilisez le tableau de bord pour la
                configuration SMTP, la gestion des modules et les diagnostics système.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px] 2xl:gap-8">
        {/* Main column */}
        <div className="space-y-6">
          <section className={profileUi.card}>
            <div className={profileUi.cardHeader}>
              <h2 className={profileUi.cardTitle}>
                <User className={`${profileUi.sectionIcon} ${theme.sectionIcon}`} />
                Identité du compte
              </h2>
              <p className={profileUi.cardSubtitle}>
                Informations verrouillées — modifiables par l&apos;administration
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 sm:p-6 md:p-8">
              {[
                { label: "Nom complet", value: displayName },
                { label: "Email", value: displayEmail },
                { label: "Rôle", value: roleLabel },
              ].map((field) => (
                <label key={field.label} className="space-y-1.5">
                  <span className={profileUi.label}>{field.label}</span>
                  <input value={field.value} readOnly className={profileUi.inputReadonly} />
                </label>
              ))}
            </div>
          </section>

          <form onSubmit={handleUpdateAcademicProfile} className="space-y-6">
            <section className={profileUi.card}>
              <div className={profileUi.cardHeader}>
                <h2 className={profileUi.cardTitle}>
                  <GraduationCap className={`${profileUi.sectionIcon} ${theme.sectionIcon}`} />
                  Informations académiques
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:p-6 md:grid-cols-2 md:p-8">
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
                    className={inputFocus}
                  />
                ))}

                <textarea
                  rows={3}
                  placeholder="Domaines d'enseignement (séparés par des virgules)"
                  value={academicProfileForm.teachingDomains}
                  onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, teachingDomains: e.target.value }))}
                  className={inputFocus}
                />
                <textarea
                  rows={3}
                  placeholder="Domaines de recherche (séparés par des virgules)"
                  value={academicProfileForm.researchDomains}
                  onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, researchDomains: e.target.value }))}
                  className={inputFocus}
                />
                <textarea
                  rows={4}
                  placeholder="Biographie courte"
                  value={academicProfileForm.bio}
                  onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                  className={`md:col-span-2 ${inputFocus}`}
                />
              </div>
            </section>

            <section className={profileUi.card}>
              <div className={profileUi.cardHeader}>
                <h2 className={profileUi.cardTitle}>
                  <Link2 className={`${profileUi.sectionIcon} ${theme.sectionIcon}`} />
                  Liens & présence en ligne
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:p-6 md:grid-cols-2 md:p-8">
                {[
                  { key: "linkedIn" as const, placeholder: "LinkedIn", icon: ExternalLink },
                  { key: "orcid" as const, placeholder: "ORCID", icon: ExternalLink },
                  { key: "googleScholar" as const, placeholder: "Google Scholar", icon: ExternalLink },
                  { key: "website" as const, placeholder: "Site personnel", icon: Globe },
                ].map((field) => (
                  <div key={field.key} className="relative">
                    <field.icon className={profileUi.inputIcon} />
                    <input
                      placeholder={field.placeholder}
                      value={academicProfileForm[field.key]}
                      onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className={`${inputFocus} pl-10`}
                    />
                  </div>
                ))}
              </div>
            </section>

            <div className={profileUi.saveBtnWrap}>
              <button type="submit" className={profileUi.saveBtn}>
                Enregistrer le profil
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className={profileUi.card}>
            <div className={profileUi.cardHeader}>
              <h3 className={profileUi.cardTitle}>
                <User className={`${profileUi.sectionIcon} ${theme.sectionIcon}`} />
                Photo de profil
              </h3>
              <p className={profileUi.cardSubtitle}>Recadrez la zone visible comme sur WhatsApp</p>
            </div>
            <div className="p-5 sm:p-6">
              <ProfileAvatarUpload
                avatarUrl={academicProfileForm.avatarUrl || currentUser.avatarUrl}
                initials={getInitials(displayName)}
                statusMsg={avatarStatusMsg}
                accent={theme.uploadAccent}
                variant="dark"
                previewSize={90}
                onUpload={handleUploadAvatarFile}
                onDelete={handleDeleteAvatar}
              />

              <form onSubmit={handleUpdateAcademicAvatar} className={`mt-5 space-y-3 ${profileUi.divider} pt-5`}>
                <input
                  placeholder="URL de la photo"
                  value={academicProfileForm.avatarUrl}
                  onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                  className={inputFocus}
                />
                <button type="submit" className={profileUi.secondaryBtn}>
                  Utiliser cette URL
                </button>
              </form>
            </div>
          </section>

          <section className={profileUi.card}>
            <div className={profileUi.cardHeader}>
              <h3 className={profileUi.cardTitle}>
                <Lock className={`${profileUi.sectionIcon} ${theme.sectionIcon}`} />
                Sécurité
              </h3>
            </div>
            <form onSubmit={handleChangeAcademicPassword} className="space-y-3 p-5 sm:p-6">
              <input
                type="password"
                placeholder="Mot de passe actuel"
                value={academicPasswordForm.currentPassword}
                onChange={(e) => setAcademicPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                className={inputFocus}
              />
              <input
                type="password"
                placeholder="Nouveau mot de passe"
                value={academicPasswordForm.newPassword}
                onChange={(e) => setAcademicPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                className={inputFocus}
              />
              <button type="submit" className={profileUi.passwordBtn}>
                Mettre à jour le mot de passe
              </button>
            </form>
            <div className="border-t border-slate-100 p-5 sm:p-6">
              <SecuritySettingsPanel />
            </div>
          </section>

          <section className={profileUi.card}>
            <div className={profileUi.cardHeader}>
              <h3 className={profileUi.cardTitle}>
                <BookOpen className={`${profileUi.sectionIcon} ${theme.sectionIcon}`} />
                Activité
              </h3>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { label: "Modules", value: academicProfileData?.courses.length || 0, icon: BookOpen },
                  { label: "Lives", value: academicProfileData?.lives.length || 0, icon: Video },
                  { label: "Publiés", value: academicProfileData?.publishedContentsCount || 0, icon: GraduationCap },
                ].map((stat) => (
                  <div key={stat.label} className={profileUi.statCard}>
                    <stat.icon className={profileUi.statIcon} />
                    <p className={profileUi.statValue}>{stat.value}</p>
                    <p className={profileUi.statLabel}>{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className={profileUi.label}>Modules récents</p>
                {(academicProfileData?.courses || []).slice(0, 4).map((course) => (
                  <div key={course.id} className={profileUi.listItem}>
                    <span className={profileUi.listItemTitle}>{course.title}</span>
                    <span className={course.published ? profileUi.published : profileUi.draft}>
                      {course.published ? "Publié" : "Brouillon"}
                    </span>
                  </div>
                ))}
                {(academicProfileData?.courses || []).length === 0 && (
                  <p className="text-xs text-slate-500">Aucun module associé.</p>
                )}
              </div>

              <div className="space-y-2">
                <p className={profileUi.label}>Lives récents</p>
                {(academicProfileData?.lives || []).slice(0, 3).map((live) => (
                  <div key={live.id} className={profileUi.listItem}>
                    <div className="min-w-0">
                      <p className={`truncate ${profileUi.listItemTitle}`}>
                        {live.course?.title || `Module ${live.courseId}`}
                      </p>
                      <p className={`mt-0.5 ${profileUi.listItemMeta}`}>
                        {live.active ? "En direct" : "Terminé"} ·{" "}
                        {new Date(live.startedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
                {(academicProfileData?.lives || []).length === 0 && (
                  <p className="text-xs text-slate-500">Aucun live organisé.</p>
                )}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
