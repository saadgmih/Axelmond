import React from "react";
import { Search, Sparkles, Menu } from "lucide-react";
import { Course } from "../types";
import { AppUser } from "./AuthScreen";
import LogoSymbol from "./LogoSymbol";

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

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm flex-shrink-0 transition-colors">
      {/* Search Bar / Context Title */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer flex-shrink-0 animate-in fade-in"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Standalone ARL icon on mobile */}
        <LogoSymbol className="w-7 h-7 text-indigo-600 dark:text-indigo-400 flex-shrink-0 md:hidden" />

        {role === "teacher" ? (
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Horizontal Logo (icon next to text) on desktop */}
            <LogoSymbol className="w-6 h-6 text-pink-600 flex-shrink-0 hidden md:block" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-none truncate hidden sm:block">
              CONSOLE AXELMOND RESEARCH LABS
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-none truncate sm:hidden">
              CONSOLE ARL
            </span>
          </div>
        ) : currentView === "catalog" ? (
          <div className="relative w-full max-w-md">
            <Search className="w-5 h-5 absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-500 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par matière, programmation, bases de données..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Horizontal Logo (icon next to text) on desktop */}
            <LogoSymbol className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0 hidden md:block" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest bg-clip-text truncate hidden sm:block">
              PORTAIL ACADÉMIQUE AXELMOND RESEARCH LABS
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest bg-clip-text truncate sm:hidden">
              PORTAIL ARL
            </span>
          </div>
        )}
      </div>

      {/* Credits & Quick Info */}
      <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
        <div className="hidden sm:flex flex-col items-end text-right">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Utilisateur Actuel
          </span>
          <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate max-w-[140px] block">
            {currentUser ? currentUser.fullName : "Axelmond Research Labs"}
          </span>
        </div>

        <div className="hidden md:block w-px h-8 bg-slate-200 dark:bg-slate-800"></div>

        {role === "teacher" ? (
          <div className="bg-pink-50/70 border border-pink-100 dark:border-pink-900/40 px-4 py-1.5 rounded-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-600 dark:text-pink-400" />
            <span className="text-xs font-extrabold text-pink-700 dark:text-pink-300 font-mono">
              {currentUser?.role === "ADMIN" ? "Administrateur" : "Professeur / Chercheur"}
            </span>
          </div>
        ) : (
          <div className="bg-indigo-50/70 border border-indigo-100 dark:border-indigo-900/40 px-4 py-1.5 rounded-xl flex items-center gap-2">
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
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity disabled:opacity-100 cursor-pointer"
        >
          {currentUser?.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt="Photo de profil" className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold text-xs">
              {currentUser ? getInitials(currentUser.fullName) : (role === "teacher" ? "AR" : "AR")}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
