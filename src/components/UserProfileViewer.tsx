import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Building2,
  ExternalLink,
  FlaskConical,
  GraduationCap,
  Loader2,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { api } from "../api";
import { getClientErrorMessage } from "../client-errors";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { ConsultableUserProfile } from "../types";

interface UserProfileViewerContextValue {
  openUserProfile: (userId: string, fallbackName?: string) => void;
}

const UserProfileViewerContext = createContext<UserProfileViewerContextValue | null>(null);

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  return (parts[0] || "PA").slice(0, 2).toUpperCase();
}

function getRoleLabel(role: string) {
  if (role === "STUDENT") return "Étudiant";
  if (role === "ADMIN") return "Administrateur";
  if (role === "RESEARCHER") return "Chercheur";
  return "Professeur";
}

function DetailCard({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3.5">
      <div className="flex items-center gap-2 text-emerald-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-xs font-bold leading-relaxed text-slate-100">{value}</p>
    </div>
  );
}

function ProfileContent({ profile }: { profile: ConsultableUserProfile }) {
  const { user, academic, courses } = profile;
  const details = [
    academic?.department ? { icon: Building2, label: "Département", value: academic.department } : null,
    academic?.lab ? { icon: FlaskConical, label: "Laboratoire", value: academic.lab } : null,
    academic?.speciality ? { icon: GraduationCap, label: "Spécialité", value: academic.speciality } : null,
    user.filiere ? { icon: BookOpen, label: "Filière", value: user.filiere } : null,
  ].filter((item): item is { icon: typeof Building2; label: string; value: string } => Boolean(item));
  const links = academic
    ? [
        ["LinkedIn", academic.links.linkedIn],
        ["ORCID", academic.links.orcid],
        ["Google Scholar", academic.links.googleScholar],
        ["Site web", academic.links.website],
      ].filter((item): item is [string, string] => Boolean(item[1]))
    : [];

  return (
    <>
      <div className="relative overflow-hidden border-b border-white/[0.07] bg-gradient-to-br from-emerald-950 via-[#082b25] to-slate-950 px-5 pb-6 pt-8 sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-emerald-300/25 bg-emerald-500/10 text-2xl font-black text-emerald-100 shadow-2xl shadow-black/30">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={`Photo de ${user.fullName}`} className="h-full w-full object-cover" />
            ) : (
              getInitials(user.fullName)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {getRoleLabel(user.role)}
            </span>
            <h2
              id="consultable-user-profile-title"
              className="mt-3 truncate text-2xl font-black text-white sm:text-3xl"
            >
              {user.fullName}
            </h2>
            <p className="mt-1.5 text-sm font-semibold text-emerald-200/75">
              {user.title || (user.role === "STUDENT" ? "Membre étudiant" : "Membre de l’équipe académique")}
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[min(64vh,620px)] space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
        {details.length > 0 && (
          <section aria-label="Informations principales" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {details.map((detail) => (
              <DetailCard key={detail.label} {...detail} />
            ))}
          </section>
        )}

        {academic?.bio && (
          <section>
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
              <UserRound className="h-4 w-4" aria-hidden="true" /> À propos
            </h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{academic.bio}</p>
          </section>
        )}

        {academic && (academic.teachingDomains.length > 0 || academic.researchDomains.length > 0) && (
          <section className="grid gap-4 sm:grid-cols-2">
            {[
              ["Domaines d’enseignement", academic.teachingDomains],
              ["Domaines de recherche", academic.researchDomains],
            ].map(([label, domains]) =>
              (domains as string[]).length > 0 ? (
                <div key={label as string}>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(domains as string[]).map((domain) => (
                      <span
                        key={domain}
                        className="rounded-full border border-teal-300/15 bg-teal-400/[0.07] px-2.5 py-1 text-[10px] font-bold text-teal-200"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </section>
        )}

        {courses.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
              <BookOpen className="h-4 w-4" aria-hidden="true" /> Modules publiés
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {courses.map((course) => (
                <div key={course.id} className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-3.5 py-3">
                  <p className="truncate text-xs font-bold text-slate-100">{course.title}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-slate-500">
                    {course.level} · {course.category}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {links.length > 0 && (
          <section className="flex flex-wrap gap-2" aria-label="Liens académiques">
            {links.map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="kbd-nav-focus inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:border-emerald-300/25 hover:text-emerald-200"
              >
                {label} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ))}
          </section>
        )}

        {!academic?.bio && details.length === 0 && courses.length === 0 && (
          <p className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-5 text-center text-sm text-slate-400">
            Ce membre n’a pas encore complété les informations publiques de son profil.
          </p>
        )}
      </div>
    </>
  );
}

export function UserProfileViewerProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<{ userId: string; fallbackName: string } | null>(null);
  const [profile, setProfile] = useState<ConsultableUserProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef(new Map<string, ConsultableUserProfile>());
  useFocusTrap(dialogRef, Boolean(target));

  const close = useCallback(() => setTarget(null), []);
  const openUserProfile = useCallback((userId: string, fallbackName = "Utilisateur") => {
    if (!userId) return;
    setTarget({ userId, fallbackName });
  }, []);

  useEffect(() => {
    if (!target) return;
    const cached = cacheRef.current.get(target.userId);
    if (cached) {
      setProfile(cached);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setProfile(null);
    setError("");
    setLoading(true);
    void api
      .getUserProfile(target.userId)
      .then((payload) => {
        if (cancelled) return;
        cacheRef.current.set(target.userId, payload);
        setProfile(payload);
      })
      .catch((requestError) => {
        if (!cancelled) setError(getClientErrorMessage(requestError, "Profil indisponible pour le moment."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, target]);

  return (
    <UserProfileViewerContext.Provider value={{ openUserProfile }}>
      {children}
      {target &&
        createPortal(
          <div
            className="fixed inset-0 z-[180] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="consultable-user-profile-title"
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-emerald-300/15 bg-[#041814] shadow-2xl shadow-black/60"
            >
              <button
                type="button"
                onClick={close}
                aria-label="Fermer le profil"
                className="kbd-nav-focus absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-slate-300 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              {loading && (
                <div
                  className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center"
                  role="status"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-300" />
                  <p id="consultable-user-profile-title" className="text-sm font-bold text-slate-300">
                    Chargement du profil de {target.fallbackName}…
                  </p>
                </div>
              )}
              {!loading && error && (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center" role="alert">
                  <UserRound className="h-10 w-10 text-slate-600" />
                  <h2 id="consultable-user-profile-title" className="mt-4 text-lg font-black text-white">
                    Profil indisponible
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{error}</p>
                </div>
              )}
              {!loading && !error && profile && <ProfileContent profile={profile} />}
            </div>
          </div>,
          document.body,
        )}
    </UserProfileViewerContext.Provider>
  );
}

interface UserProfileTriggerProps {
  userId?: string | null;
  userName: string;
  avatarUrl?: string | null;
  prefix?: string;
  showAvatar?: boolean;
  className?: string;
  children?: ReactNode;
  dataOnboarding?: string;
}

export function UserProfileTrigger({
  userId,
  userName,
  avatarUrl,
  prefix,
  showAvatar = true,
  className = "inline-flex min-w-0 items-center gap-1.5",
  children,
  dataOnboarding,
}: UserProfileTriggerProps) {
  const viewer = useContext(UserProfileViewerContext);
  const content = children || (
    <>
      {showAvatar && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-current/20 bg-emerald-500/10 text-[8px] font-black">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(userName)}
        </span>
      )}
      <span className="truncate">
        {prefix ? `${prefix} ` : ""}
        <span className="font-bold underline decoration-current/30 underline-offset-2">{userName}</span>
      </span>
    </>
  );

  if (!userId || !viewer) {
    return (
      <span className={className} data-onboarding={dataOnboarding}>
        {content}
      </span>
    );
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    viewer.openUserProfile(userId, userName);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-onboarding={dataOnboarding}
      aria-label={`Consulter le profil de ${userName}`}
      title={`Consulter le profil de ${userName}`}
      className={`kbd-nav-focus rounded-lg text-left transition-colors hover:text-emerald-300 ${className}`}
    >
      {content}
    </button>
  );
}
