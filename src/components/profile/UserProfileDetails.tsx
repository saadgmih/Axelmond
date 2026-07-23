import { useEffect, useState, type FormEvent } from "react";
import {
  BookOpen,
  CalendarDays,
  Globe2,
  GraduationCap,
  Languages,
  MapPin,
  Phone,
  Save,
  School,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { ConsultableUserProfile, EditableUserProfileInput } from "../../types";

interface UserProfileDetailsProps {
  profile: ConsultableUserProfile;
  editable: boolean;
  saving: boolean;
  statusMessage: string;
  errorMessage: string;
  onSave: (input: EditableUserProfileInput) => void | Promise<void>;
}

function buildForm(profile: ConsultableUserProfile): EditableUserProfileInput {
  const { user } = profile;
  return {
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    phone: user.phone || "",
    birthDate: user.birthDate || "",
    country: user.country || "",
    city: user.city || "",
    preferredLanguage: user.preferredLanguage || "",
    institution: user.institution || "",
    filiere: user.filiere || "",
    studyLevel: user.studyLevel || "",
    academicYear: user.academicYear || "",
  };
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "text" | "tel" | "date";
  placeholder: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.13em] text-slate-500">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        maxLength={type === "tel" ? 30 : 160}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="kbd-nav-focus min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/45 focus:bg-emerald-950/20"
      />
    </label>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3.5">
      <div className="flex items-center gap-2 text-emerald-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      </div>
      <p className={`mt-2 text-xs font-bold leading-relaxed ${value ? "text-slate-100" : "text-slate-600"}`}>
        {value || "Non renseigné"}
      </p>
    </div>
  );
}

function formatBirthDate(value?: string | null) {
  if (!value) return value;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC" }).format(parsed);
}

export function UserProfileDetails({
  profile,
  editable,
  saving,
  statusMessage,
  errorMessage,
  onSave,
}: UserProfileDetailsProps) {
  const [form, setForm] = useState(() => buildForm(profile));
  const isStudent = profile.user.role === "STUDENT";

  useEffect(() => setForm(buildForm(profile)), [profile]);

  const update = (field: keyof EditableUserProfileInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void onSave(form);
  };

  if (!editable) {
    return (
      <section aria-labelledby="profile-common-information-title">
        <h3
          id="profile-common-information-title"
          className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300"
        >
          <UserRound className="h-4 w-4" aria-hidden="true" /> Informations du profil
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoCard icon={UserRound} label="Prénom" value={profile.user.firstName} />
          <InfoCard icon={UserRound} label="Nom" value={profile.user.lastName} />
          <InfoCard icon={Phone} label="Téléphone" value={profile.user.phone} />
          <InfoCard icon={CalendarDays} label="Date de naissance" value={formatBirthDate(profile.user.birthDate)} />
          <InfoCard icon={Globe2} label="Pays" value={profile.user.country} />
          <InfoCard icon={MapPin} label="Ville" value={profile.user.city} />
          <InfoCard icon={Languages} label="Langue préférée" value={profile.user.preferredLanguage} />
        </div>

        {isStudent && (
          <>
            <h3 className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
              <GraduationCap className="h-4 w-4" aria-hidden="true" /> Profil étudiant
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoCard icon={School} label="Établissement" value={profile.user.institution} />
              <InfoCard icon={BookOpen} label="Filière" value={profile.user.filiere} />
              <InfoCard icon={GraduationCap} label="Niveau d’études" value={profile.user.studyLevel} />
              <InfoCard icon={CalendarDays} label="Année universitaire" value={profile.user.academicYear} />
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.035] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
            <UserRound className="h-4 w-4" aria-hidden="true" /> Informations communes
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">Écrivez librement vos informations dans les champs.</p>
        </div>
        <span className="text-[10px] font-semibold text-slate-600">* champs obligatoires</span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Prénom"
          value={form.firstName}
          required
          placeholder="Écrire le prénom"
          onChange={(value) => update("firstName", value)}
        />
        <Field
          label="Nom"
          value={form.lastName}
          required
          placeholder="Écrire le nom"
          onChange={(value) => update("lastName", value)}
        />
        <Field
          label="Numéro de téléphone"
          type="tel"
          value={form.phone}
          placeholder="Écrire le numéro"
          onChange={(value) => update("phone", value)}
        />
        <Field
          label="Date de naissance"
          type="date"
          value={form.birthDate}
          placeholder="AAAA-MM-JJ"
          onChange={(value) => update("birthDate", value)}
        />
        <Field
          label="Pays"
          value={form.country}
          placeholder="Écrire le pays"
          onChange={(value) => update("country", value)}
        />
        <Field
          label="Ville"
          value={form.city}
          placeholder="Écrire la ville"
          onChange={(value) => update("city", value)}
        />
        <Field
          label="Langue préférée"
          value={form.preferredLanguage}
          placeholder="Écrire la langue"
          onChange={(value) => update("preferredLanguage", value)}
        />
      </div>

      {isStudent && (
        <div className="mt-5 border-t border-white/[0.07] pt-5">
          <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
            <GraduationCap className="h-4 w-4" aria-hidden="true" /> Profil étudiant
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Établissement"
              value={form.institution}
              placeholder="Écrire l’établissement"
              onChange={(value) => update("institution", value)}
            />
            <Field
              label="Filière"
              value={form.filiere}
              placeholder="Écrire la filière"
              onChange={(value) => update("filiere", value)}
            />
            <Field
              label="Niveau d’études"
              value={form.studyLevel}
              placeholder="Écrire le niveau"
              onChange={(value) => update("studyLevel", value)}
            />
            <Field
              label="Année universitaire"
              value={form.academicYear}
              placeholder="Exemple : 2026–2027"
              onChange={(value) => update("academicYear", value)}
            />
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className="min-h-5 text-xs font-semibold">
          {errorMessage ? <span className="text-rose-300">{errorMessage}</span> : null}
          {!errorMessage && statusMessage ? <span className="text-emerald-300">{statusMessage}</span> : null}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="kbd-nav-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {saving ? "Enregistrement…" : "Enregistrer le profil"}
        </button>
      </div>
    </form>
  );
}
