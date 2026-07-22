import { type RefObject } from "react";
import { Search, Mic, BadgeCheck, PanelTopClose, PanelTopOpen } from "lucide-react";
import { Course } from "../types";
import { AppUser } from "./AuthScreen";
import { type UserRole } from "../rbac";
import LogoSymbol from "./LogoSymbol";
import { useVoiceSearch } from "../hooks/useVoiceSearch";
import { useSidebarLayout } from "../hooks/useSidebarLayout";
import AccessibilityControls from "./AccessibilityControls";
import { LayoutFloatingToggle } from "./LayoutFloatingToggle";
import { useOnboarding } from "../onboarding/OnboardingProvider";

interface TopbarProps {
  currentView: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
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
  return "Accès professeur";
}

function getBrandKicker(role: "student" | "teacher") {
  return role === "teacher" ? "Console" : "Portail";
}

function getBrandSubtitle(role: "student" | "teacher") {
  return role === "teacher" ? "Plateforme de gestion académique" : "Espace académique et modules";
}

function TopbarBrand({ role }: { role: "student" | "teacher" }) {
  return (
    <div className="topbar-brand">
      <div className="topbar-brand-logo">
        <LogoSymbol className={`h-7 w-7 ${role === "teacher" ? "text-emerald-400" : "text-emerald-400"}`} />
      </div>
      <div className="min-w-0">
        <p className="topbar-brand-kicker">{getBrandKicker(role)}</p>
        <p className="topbar-brand-title">Performance Académique</p>
        <p className="topbar-brand-subtitle hidden sm:block">{getBrandSubtitle(role)}</p>
      </div>
    </div>
  );
}

export default function Topbar({
  currentView,
  searchQuery,
  setSearchQuery,
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
  const { isDrawer } = useSidebarLayout();
  const onboarding = useOnboarding();
  const canCollapseTopbar = Boolean(onToggleTopbarCollapsed);
  const effectiveTopbarCollapsed = canCollapseTopbar && isTopbarCollapsed;

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
          className={`kbd-nav-focus min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-9 text-xs text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            isListening ? "border-emerald-500/40 pr-[7.5rem] ring-2 ring-emerald-500/40" : "pr-12"
          }`}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {isListening && (
            <span
              className="voice-search-listening-label hidden text-[10px] font-bold uppercase tracking-wide text-emerald-400 sm:inline"
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
                ? "voice-search-mic-active border-emerald-500/50 bg-emerald-950/60 text-emerald-400 shadow-[0_0_12px_rgba(236,72,153,0.35)]"
                : "border-transparent bg-transparent text-slate-400 hover:border-teal-500/30 hover:bg-teal-950/40 hover:text-teal-400"
            }`}
          >
            <Mic className={`h-4 w-4 ${isListening ? "voice-search-mic-pulse" : ""}`} />
          </button>
        </div>
      </div>
      {voiceSearchError && (
        <p role="alert" className="text-[10px] font-semibold leading-snug text-lime-300">
          {voiceSearchError}
        </p>
      )}
    </div>
  );

  const topbarFloatingToggle = canCollapseTopbar ? (
    <LayoutFloatingToggle
      anchor="topbar"
      storageKey="axelmond_topbar_toggle_position"
      ariaLabel={effectiveTopbarCollapsed ? "Afficher la barre supérieure" : "Masquer la barre supérieure"}
      ariaPressed={effectiveTopbarCollapsed}
      title="Glisser pour déplacer, cliquer pour basculer la barre supérieure"
      onActivate={() => onToggleTopbarCollapsed?.()}
      className="topbar-collapse-toggle"
    >
      {effectiveTopbarCollapsed ? (
        <PanelTopOpen className="layout-collapse-toggle-icon" aria-hidden="true" />
      ) : (
        <PanelTopClose className="layout-collapse-toggle-icon" aria-hidden="true" />
      )}
    </LayoutFloatingToggle>
  ) : null;

  if (effectiveTopbarCollapsed) {
    return topbarFloatingToggle;
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

        <div className="topbar-console-actions flex w-full flex-wrap items-center justify-center gap-3 sm:gap-4 lg:w-auto lg:justify-end">
          {isDrawer && role === "student" && currentView === "catalog" && (
            <div className="w-full max-w-md basis-full lg:hidden">{catalogSearch}</div>
          )}

          <div data-onboarding="platform-settings">
            <AccessibilityControls
              labeled
              onRestartTutorial={onboarding.restart}
              onOpenNotifications={onOpenNotifications}
              notificationUnreadCount={notificationUnreadCount}
              activeView={activeView}
            />
          </div>

          <div className="hidden h-12 w-px bg-white/10 lg:block" aria-hidden="true" />

          <div className="flex min-w-0 flex-col items-center text-center lg:items-end lg:text-right">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-300/80">
              Utilisateur actuel
            </span>
            <span className="mt-0.5 flex max-w-[220px] items-center justify-center gap-1.5 truncate text-sm font-black text-white lg:justify-end">
              {currentUser ? currentUser.fullName : "Performance Académique"}
              <BadgeCheck className="h-4 w-4 shrink-0 text-teal-400" aria-hidden="true" />
            </span>
            <span className="mt-0.5 text-[11px] font-medium text-slate-400">
              {getAccessLabel(role, currentUser?.role)}
            </span>
          </div>

          <button
            type="button"
            data-onboarding="profile-menu"
            onClick={openProfile}
            aria-label={currentUser ? `Profil de ${currentUser.fullName}` : "Profil utilisateur"}
            className="topbar-avatar-button kbd-nav-focus touch-target"
          >
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="topbar-avatar-image object-cover" />
            ) : (
              <div className="topbar-avatar-fallback">{currentUser ? getInitials(currentUser.fullName) : "PA"}</div>
            )}
            <span className="topbar-avatar-online" aria-hidden="true" />
          </button>
        </div>
        {topbarFloatingToggle}
      </header>
    </div>
  );
}
