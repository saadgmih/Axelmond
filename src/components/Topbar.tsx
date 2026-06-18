import { type ReactNode, type RefObject } from "react";
import { Search, Sparkles, Mic, Bell, BadgeCheck, ChevronDown, PanelTopClose, PanelTopOpen } from "lucide-react";
import { Course } from "../types";
import { AppUser } from "./AuthScreen";
import { getRoleLabel, getTeacherRoleBadgeTone, type UserRole } from "../rbac";
import LogoSymbol from "./LogoSymbol";
import { useVoiceSearch } from "../hooks/useVoiceSearch";
import { useSidebarLayout } from "../hooks/useSidebarLayout";
import AccessibilityControls from "./AccessibilityControls";

interface TopbarProps {
  currentView: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  enrolledCourses: number[];
  courses: Course[];
  navigateTo: (view: string, course?: Course | null) => void;
  role?: "student" | "teacher";
  currentUser: AppUser | null;
  catalogSearchRef?: RefObject<HTMLInputElement | null>;
  notificationUnreadCount?: number;
  onOpenNotifications?: () => void;
  activeView?: string;
  onTeacherNavigate?: (view: string) => void;
  isTopbarCollapsed?: boolean;
  onToggleTopbarCollapsed?: () => void;
}

function getInitials(name: string) {
  if (!name) return "UN";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAccessLabel(role: "student" | "teacher", userRole?: UserRole) {
  if (role === "student") return "Accès étudiant";
  if (userRole === "ADMIN") return "Accès administrateur";
  if (userRole === "RESEARCHER") return "Accès chercheur";
  return "Accès professeur";
}

function getBrandKicker(role: "student" | "teacher") {
  return role === "teacher" ? "Console" : "Portail";
}

function getBrandSubtitle(role: "student" | "teacher") {
  return role === "teacher" ? "Plateforme de gestion académique" : "Espace académique et modules";
}

function TopbarConsoleAction({
  label,
  onClick,
  ariaLabel,
  ariaCurrent,
  badge,
  children,
}: {
  label: string;
  onClick?: () => void;
  ariaLabel?: string;
  ariaCurrent?: boolean;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || label}
      aria-current={ariaCurrent ? "page" : undefined}
      className="topbar-console-action kbd-nav-focus touch-target"
    >
      <span className="relative inline-flex">
        {children}
        {badge != null && badge > 0 && (
          <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-black leading-none text-white shadow-lg shadow-violet-900/40">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="topbar-console-action-label">{label}</span>
    </button>
  );
}

function TopbarBrand({ role }: { role: "student" | "teacher" }) {
  return (
    <div className="topbar-brand">
      <div className="topbar-brand-logo">
        <LogoSymbol className={`h-7 w-7 ${role === "teacher" ? "text-pink-400" : "text-indigo-400"}`} />
      </div>
      <div className="min-w-0">
        <p className="topbar-brand-kicker">{getBrandKicker(role)}</p>
        <p className="topbar-brand-title">Axelmond Research Labs</p>
        <p className="topbar-brand-subtitle hidden sm:block">{getBrandSubtitle(role)}</p>
      </div>
    </div>
  );
}

function RolePill({
  role,
  userRole,
  onClick,
}: {
  role: "student" | "teacher";
  userRole?: UserRole;
  onClick: () => void;
}) {
  const tone =
    role === "student"
      ? "border-indigo-400/25 bg-indigo-500/15 text-indigo-100"
      : getTeacherRoleBadgeTone(userRole) === "admin"
        ? "border-violet-400/25 bg-violet-500/15 text-violet-100"
        : getTeacherRoleBadgeTone(userRole) === "researcher"
          ? "border-amber-400/25 bg-amber-500/15 text-amber-100"
          : "border-pink-400/25 bg-pink-500/15 text-pink-100";

  const iconTone =
    role === "student"
      ? "text-indigo-300"
      : getTeacherRoleBadgeTone(userRole) === "admin"
        ? "text-violet-300"
        : getTeacherRoleBadgeTone(userRole) === "researcher"
          ? "text-amber-300"
          : "text-pink-300";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`topbar-role-pill kbd-nav-focus hidden lg:inline-flex ${tone}`}
      aria-label={`Ouvrir le profil ${getRoleLabel(userRole)}`}
    >
      <Sparkles className={`h-4 w-4 ${iconTone}`} />
      <span>{role === "student" ? "Étudiant" : getRoleLabel(userRole)}</span>
      <ChevronDown className="h-4 w-4 opacity-80" />
    </button>
  );
}

export default function Topbar({
  currentView,
  searchQuery,
  setSearchQuery,
  enrolledCourses,
  courses,
  navigateTo,
  role = "student",
  currentUser,
  catalogSearchRef,
  notificationUnreadCount = 0,
  onOpenNotifications,
  activeView,
  onTeacherNavigate,
  isTopbarCollapsed = false,
  onToggleTopbarCollapsed,
}: TopbarProps) {
  const { isDrawer, isDocked } = useSidebarLayout();
  const canCollapseTopbar = Boolean(onToggleTopbarCollapsed);
  const effectiveTopbarCollapsed = canCollapseTopbar && isTopbarCollapsed;

  const activeCredits = enrolledCourses.reduce((sum, id) => {
    const found = courses.find((c) => c.id === id);
    return sum + (found ? found.credits : 0);
  }, 0);

  const {
    isListening,
    error: voiceSearchError,
    toggleListening,
    clearError: clearVoiceSearchError,
  } = useVoiceSearch({ onTranscript: setSearchQuery });

  const openProfile = () => {
    if (role === "student") navigateTo("profile");
    else onTeacherNavigate?.("academic-profile");
  };

  const catalogSearch = (
    <div className="w-full max-w-md space-y-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          ref={catalogSearchRef}
          id="catalog-search"
          type="search"
          placeholder="Rechercher par matière, programmation, bases de données..."
          value={searchQuery}
          onChange={(e) => {
            clearVoiceSearchError();
            setSearchQuery(e.target.value);
          }}
          aria-label="Rechercher dans le catalogue"
          className={`kbd-nav-focus min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-9 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isListening ? "border-pink-500/40 pr-[7.5rem] ring-2 ring-pink-500/40" : "pr-12"
          }`}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {isListening && (
            <span
              className="voice-search-listening-label hidden text-[10px] font-bold uppercase tracking-wide text-pink-400 sm:inline"
              aria-live="polite"
            >
              Écoute...
            </span>
          )}
          <button
            type="button"
            onClick={toggleListening}
            aria-label={isListening ? "Arrêter la recherche vocale" : "Lancer la recherche vocale"}
            aria-pressed={isListening}
            title={isListening ? "Arrêter l'écoute" : "Recherche vocale"}
            className={`touch-target kbd-nav-focus flex h-9 min-w-9 items-center justify-center rounded-lg border transition-all ${
              isListening
                ? "voice-search-mic-active border-pink-500/50 bg-pink-950/60 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.35)]"
                : "border-transparent bg-transparent text-slate-400 hover:border-violet-500/30 hover:bg-violet-950/40 hover:text-violet-400"
            }`}
          >
            <Mic className={`h-4 w-4 ${isListening ? "voice-search-mic-pulse" : ""}`} />
          </button>
        </div>
      </div>
      {voiceSearchError && (
        <p role="alert" className="text-[10px] font-semibold leading-snug text-amber-300">
          {voiceSearchError}
        </p>
      )}
    </div>
  );

  const topbarToggleButton = canCollapseTopbar ? (
    <button
      type="button"
      onClick={onToggleTopbarCollapsed}
      className="layout-collapse-toggle topbar-collapse-toggle kbd-nav-focus"
      aria-label={effectiveTopbarCollapsed ? "Afficher la barre supérieure" : "Masquer la barre supérieure"}
      aria-pressed={effectiveTopbarCollapsed}
    >
      {effectiveTopbarCollapsed ? (
        <PanelTopOpen className="layout-collapse-toggle-icon" aria-hidden="true" />
      ) : (
        <PanelTopClose className="layout-collapse-toggle-icon" aria-hidden="true" />
      )}
    </button>
  ) : null;

  if (effectiveTopbarCollapsed) {
    return (
      <div className="platform-topbar-shell platform-topbar-shell-collapsed relative z-40 flex flex-shrink-0 justify-end px-3 pt-2 sm:px-4 lg:px-6">
        {topbarToggleButton}
      </div>
    );
  }

  return (
    <div className="platform-topbar-shell flex-shrink-0 px-3 pt-3 sm:px-4 lg:px-6">
      <header className="platform-topbar platform-topbar-console relative sticky top-3 z-40 flex flex-col gap-3 px-4 py-3 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {isDrawer ? (
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:justify-start">
              <TopbarBrand role={role} />
            </div>
          ) : (
            <>
              <TopbarBrand role={role} />
              {role === "student" && currentView === "catalog" && (
                <div className="hidden min-w-0 flex-1 px-2 xl:block">{catalogSearch}</div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4 lg:flex-nowrap">
          {isDrawer && role === "student" && currentView === "catalog" && (
            <div className="order-first w-full lg:order-none lg:hidden">{catalogSearch}</div>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            {(isDocked || isDrawer) && <AccessibilityControls labeled={isDocked} />}

            {onOpenNotifications && (
              <TopbarConsoleAction
                label="Notifications"
                onClick={onOpenNotifications}
                ariaLabel="Ouvrir les notifications"
                ariaCurrent={activeView === "notifications"}
                badge={notificationUnreadCount}
              >
                <Bell className="topbar-console-action-icon" />
              </TopbarConsoleAction>
            )}
          </div>

          {isDocked && (
            <>
              <div className="hidden h-12 w-px bg-white/10 sm:block" aria-hidden="true" />

              <div className="hidden min-w-0 flex-col items-end text-right sm:flex">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300/80">
                  Utilisateur actuel
                </span>
                <span className="mt-0.5 flex max-w-[220px] items-center justify-end gap-1.5 truncate text-sm font-black text-white">
                  {currentUser ? currentUser.fullName : "Axelmond Research Labs"}
                  <BadgeCheck className="h-4 w-4 shrink-0 text-violet-400" aria-hidden="true" />
                </span>
                <span className="mt-0.5 text-[11px] font-medium text-slate-400">
                  {getAccessLabel(role, currentUser?.role)}
                </span>
              </div>

              <RolePill role={role} userRole={currentUser?.role} onClick={openProfile} />

              {role === "student" && (
                <div className="hidden items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 md:flex">
                  <Sparkles className="h-4 w-4 text-indigo-300" />
                  <span className="font-mono text-xs font-extrabold text-indigo-200">{activeCredits} ARL</span>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            onClick={openProfile}
            aria-label={currentUser ? `Profil de ${currentUser.fullName}` : "Profil utilisateur"}
            className="topbar-avatar-button kbd-nav-focus touch-target"
          >
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="topbar-avatar-image object-cover" />
            ) : (
              <div className="topbar-avatar-fallback">{currentUser ? getInitials(currentUser.fullName) : "AR"}</div>
            )}
            <span className="topbar-avatar-online" aria-hidden="true" />
          </button>
        </div>
        {topbarToggleButton}
      </header>
    </div>
  );
}
