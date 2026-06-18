import { type RefObject } from "react";
import { Search, Sparkles, Menu, Mic, Bell } from "lucide-react";
import { Course } from "../types";
import { AppUser } from "./AuthScreen";
import { getRoleLabel, getTeacherRoleBadgeTone } from "../rbac";
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
  const { isDrawer, isDocked } = useSidebarLayout();

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
    <header className="platform-topbar sticky top-0 z-40 flex flex-shrink-0 items-center justify-between border-b border-white/10 bg-slate-950/85 px-4 py-3 shadow-sm backdrop-blur-xl lg:px-8 lg:py-4">
      <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-3.5">
        {onToggleMobileMenu && isDrawer && (
          <button
            onClick={onToggleMobileMenu}
            className="flex touch-target kbd-nav-focus items-center justify-center rounded-xl p-2 text-slate-300 hover:bg-white/5"
            title="Menu"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {isDrawer && (
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <LogoSymbol className="h-7 w-7 shrink-0 text-indigo-400" />
            <div className="min-w-0 text-center">
              <span className="block truncate text-sm font-black tracking-tight text-white">Axelmond</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-indigo-300">Research Labs</span>
            </div>
          </div>
        )}

        {isDocked && (
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            {role === "teacher" ? (
              <div className="flex min-w-0 items-center gap-2.5">
                <LogoSymbol className="h-6 w-6 shrink-0 text-pink-400" />
                <span className="hidden truncate text-xs font-bold uppercase leading-none tracking-widest text-slate-300 sm:block">
                  CONSOLE AXELMOND RESEARCH LABS
                </span>
                <span className="truncate text-xs font-bold uppercase leading-none tracking-widest text-slate-300 sm:hidden">
                  CONSOLE ARL
                </span>
              </div>
            ) : currentView === "catalog" ? (
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
            ) : (
              <div className="flex min-w-0 items-center gap-2.5">
                <LogoSymbol className="h-6 w-6 shrink-0 text-indigo-400" />
                <span className="hidden truncate text-xs font-bold uppercase tracking-widest text-slate-300 sm:block">
                  PORTAIL ACADÉMIQUE AXELMOND RESEARCH LABS
                </span>
                <span className="truncate text-xs font-bold uppercase tracking-widest text-slate-300 sm:hidden">
                  PORTAIL ARL
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 lg:gap-4">
        {isDrawer && onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Ouvrir les notifications"
            aria-current={activeView === "notifications" ? "page" : undefined}
            className="relative touch-target kbd-nav-focus rounded-xl border border-white/10 p-2.5 text-slate-300 hover:text-indigo-300"
          >
            <Bell className="h-5 w-5" />
            {notificationUnreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1 text-[10px] font-black leading-[18px] text-white">
                {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
              </span>
            )}
          </button>
        )}

        {isDocked && <AccessibilityControls />}

        {isDocked && onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Ouvrir les notifications"
            aria-current={activeView === "notifications" ? "page" : undefined}
            className="relative hidden touch-target kbd-nav-focus rounded-xl border border-white/10 p-2.5 text-slate-300 hover:text-indigo-300 sm:inline-flex"
          >
            <Bell className="h-5 w-5" />
            {notificationUnreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1 text-[10px] font-black leading-[18px] text-white">
                {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
              </span>
            )}
          </button>
        )}

        {isDocked && (
          <div className="hidden flex-col items-end text-right sm:flex">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Utilisateur Actuel
            </span>
            <span className="block max-w-[140px] truncate text-xs font-black text-slate-100">
              {currentUser ? currentUser.fullName : "Axelmond Research Labs"}
            </span>
          </div>
        )}

        {isDocked && <div className="hidden h-8 w-px bg-white/10 sm:block" />}

        {isDocked && role === "teacher" ? (
          <div
            className={`hidden items-center gap-2 rounded-xl border px-4 py-1.5 sm:flex ${
              getTeacherRoleBadgeTone(currentUser?.role) === "admin"
                ? "border-violet-400/20 bg-violet-500/10"
                : getTeacherRoleBadgeTone(currentUser?.role) === "researcher"
                  ? "border-amber-400/20 bg-amber-500/10"
                  : "border-pink-400/20 bg-pink-500/10"
            }`}
          >
            <Sparkles
              className={`h-4 w-4 ${
                getTeacherRoleBadgeTone(currentUser?.role) === "admin"
                  ? "text-violet-300"
                  : getTeacherRoleBadgeTone(currentUser?.role) === "researcher"
                    ? "text-amber-300"
                    : "text-pink-300"
              }`}
            />
            <span
              className={`text-xs font-extrabold font-mono ${
                getTeacherRoleBadgeTone(currentUser?.role) === "admin"
                  ? "text-violet-200"
                  : getTeacherRoleBadgeTone(currentUser?.role) === "researcher"
                    ? "text-amber-200"
                    : "text-pink-200"
              }`}
            >
              {getRoleLabel(currentUser?.role)}
            </span>
          </div>
        ) : isDocked ? (
          <div className="hidden items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-1.5 sm:flex">
            <Sparkles className="h-4 w-4 text-indigo-300" />
            <span className="font-mono text-xs font-extrabold text-indigo-200">{activeCredits} ARL</span>
          </div>
        ) : null}

        <button
          onClick={() => {
            if (role === "student") navigateTo("profile");
          }}
          disabled={role === "teacher"}
          aria-label={currentUser ? `Profil de ${currentUser.fullName}` : "Profil utilisateur"}
          className="kbd-nav-focus flex cursor-pointer items-center gap-2.5 rounded-full transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-100"
        >
          {currentUser?.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt="Photo de profil"
              className="h-9 w-9 rounded-full border border-white/10 bg-slate-800 object-cover lg:h-8 lg:w-8"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-800 text-xs font-bold text-slate-200 lg:h-8 lg:w-8">
              {currentUser ? getInitials(currentUser.fullName) : "AR"}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
