import React, { type RefObject } from "react";
import { Search, Sparkles, Menu, Mic, Bell } from "lucide-react";
import { Course } from "../types";
import { AppUser } from "./AuthScreen";
import { getRoleLabel, getTeacherRoleBadgeTone } from "../rbac";
import LogoSymbol from "./LogoSymbol";
import { useVoiceSearch } from "../hooks/useVoiceSearch";
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
  onToggleMobileMenu?: () => void;
  catalogSearchRef?: RefObject<HTMLInputElement | null>;
  notificationUnreadCount?: number;
  onOpenNotifications?: () => void;
  activeView?: string;
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
  onToggleMobileMenu,
  catalogSearchRef,
  notificationUnreadCount = 0,
  onOpenNotifications,
  activeView,
}: TopbarProps) {
  const activeCredits = enrolledCourses.reduce((sum, id) => {
    const found = courses.find((c) => c.id === id);
    return sum + (found ? found.credits : 0);
  }, 0);

  const getInitials = (name: string) => {
    if (!name) return "UN";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const {
    isListening,
    error: voiceSearchError,
    toggleListening,
    clearError: clearVoiceSearchError,
  } = useVoiceSearch({ onTranscript: setSearchQuery });

  return (
    <header className="sticky top-0 z-40 flex flex-shrink-0 items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 py-3 shadow-sm backdrop-blur-xl transition-colors md:border-slate-200 md:bg-white md:px-8 md:py-4 md:dark:border-slate-800 md:dark:bg-slate-900">
      {/* Search Bar / Context Title */}
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-3.5">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="flex touch-target kbd-nav-focus items-center justify-center rounded-xl p-2 text-slate-300 hover:bg-white/5 md:hidden"
            title="Menu"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 md:hidden">
          <LogoSymbol className="h-7 w-7 shrink-0 text-indigo-400" />
          <div className="min-w-0 text-center">
            <span className="block truncate text-sm font-black tracking-tight text-white">Axelmond</span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-indigo-300">Research Labs</span>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 items-center gap-3.5 md:flex">
          {role === "teacher" ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <LogoSymbol className="hidden h-6 w-6 shrink-0 text-pink-600 md:block" />
              <span className="hidden truncate text-xs font-bold uppercase leading-none tracking-widest text-slate-600 dark:text-slate-300 sm:block">
                CONSOLE AXELMOND RESEARCH LABS
              </span>
              <span className="truncate text-xs font-bold uppercase leading-none tracking-widest text-slate-600 dark:text-slate-300 sm:hidden">
                CONSOLE ARL
              </span>
            </div>
          ) : currentView === "catalog" ? (
            <div className="w-full max-w-md space-y-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
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
                  className={`kbd-nav-focus min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 text-xs focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900 dark:focus:ring-indigo-500 ${
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
                        : "border-transparent bg-transparent text-slate-400 hover:border-violet-500/30 hover:bg-violet-950/40 hover:text-violet-400 dark:text-slate-500 dark:hover:text-violet-400"
                    }`}
                  >
                    <Mic className={`h-4 w-4 ${isListening ? "voice-search-mic-pulse" : ""}`} />
                  </button>
                </div>
              </div>
              {voiceSearchError && (
                <p role="alert" className="text-[10px] font-semibold leading-snug text-amber-400 dark:text-amber-300">
                  {voiceSearchError}
                </p>
              )}
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2.5">
              <LogoSymbol className="hidden h-6 w-6 shrink-0 text-indigo-600 dark:text-indigo-400 md:block" />
              <span className="hidden truncate bg-clip-text text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300 sm:block">
                PORTAIL ACADÉMIQUE AXELMOND RESEARCH LABS
              </span>
              <span className="truncate bg-clip-text text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300 sm:hidden">
                PORTAIL ARL
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Credits & Quick Info */}
      <div className="flex flex-shrink-0 items-center gap-2 md:gap-4">
        <div className="hidden md:contents">
          <AccessibilityControls />
        </div>
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Ouvrir les notifications"
            aria-current={activeView === "notifications" ? "page" : undefined}
            className="relative hidden touch-target kbd-nav-focus rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:text-indigo-500 dark:border-slate-800 dark:text-slate-400 dark:hover:text-indigo-300 md:inline-flex"
          >
            <Bell className="h-5 w-5" />
            {notificationUnreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1 text-[10px] font-black leading-[18px] text-white">
                {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
              </span>
            )}
          </button>
        )}
        <div className="hidden sm:flex flex-col items-end text-right md:flex">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Utilisateur Actuel
          </span>
          <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate max-w-[140px] block">
            {currentUser ? currentUser.fullName : "Axelmond Research Labs"}
          </span>
        </div>

        <div className="hidden md:block w-px h-8 bg-slate-200 dark:bg-slate-800"></div>

        {role === "teacher" ? (
          <div
            className={`hidden items-center gap-2 rounded-xl border px-4 py-1.5 md:flex ${
              getTeacherRoleBadgeTone(currentUser?.role) === "admin"
                ? "bg-violet-50/70 border-violet-100 dark:border-violet-900/40"
                : getTeacherRoleBadgeTone(currentUser?.role) === "researcher"
                  ? "bg-amber-50/70 border-amber-100 dark:border-amber-900/40"
                  : "bg-pink-50/70 border-pink-100 dark:border-pink-900/40"
            }`}
          >
            <Sparkles
              className={`w-4 h-4 ${
                getTeacherRoleBadgeTone(currentUser?.role) === "admin"
                  ? "text-violet-600 dark:text-violet-400"
                  : getTeacherRoleBadgeTone(currentUser?.role) === "researcher"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-pink-600 dark:text-pink-400"
              }`}
            />
            <span
              className={`text-xs font-extrabold font-mono ${
                getTeacherRoleBadgeTone(currentUser?.role) === "admin"
                  ? "text-violet-700 dark:text-violet-300"
                  : getTeacherRoleBadgeTone(currentUser?.role) === "researcher"
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-pink-700 dark:text-pink-300"
              }`}
            >
              {getRoleLabel(currentUser?.role)}
            </span>
          </div>
        ) : (
          <div className="hidden items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-1.5 dark:border-indigo-900/40 md:flex">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 font-mono">
              {activeCredits} ARL
            </span>
          </div>
        )}

        <button
          onClick={() => {
            if (role === "student") navigateTo("profile");
          }}
          disabled={role === "teacher"}
          aria-label={currentUser ? `Profil de ${currentUser.fullName}` : "Profil utilisateur"}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity disabled:opacity-100 cursor-pointer kbd-nav-focus rounded-full"
        >
          {currentUser?.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt="Photo de profil"
              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold text-xs">
              {currentUser ? getInitials(currentUser.fullName) : role === "teacher" ? "AR" : "AR"}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
