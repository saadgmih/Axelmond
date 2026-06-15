import React, { useRef } from "react";
import {
  X,
  LayoutDashboard,
  BookOpen,
  User,
  ShieldAlert,
  Sliders,
  Video,
  CalendarDays,
  LogOut,
  MessageSquare,
  Bell,
  Target,
} from "lucide-react";
import { Course, DEFAULT_STUDENT_LABEL } from "../types";
import { AppUser } from "./AuthScreen";
import { getRoleLabel, getTeacherRoleBadgeTone, getTeacherSpaceTitle } from "../rbac";
import LogoSymbol from "./LogoSymbol";
import { useTvNavigation } from "../hooks/useTvNavigation";
import { prefetchStudentView, prefetchTeacherView } from "../utils/prefetch";

interface SidebarProps {
  currentView: string;
  enrolledCourses: number[];
  isMobileMenuOpen: boolean;
  courses: Course[];
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  navigateTo: (view: string, course?: Course | null) => void;
  role: "student" | "teacher";
  teacherView: string;
  setTeacherView: (view: string) => void;
  currentUser: AppUser | null;
  onLogout: () => void;
  notificationUnreadCount?: number;
}

export default function Sidebar({
  currentView,
  enrolledCourses: _enrolledCourses,
  isMobileMenuOpen,
  courses: _courses,
  setIsMobileMenuOpen,
  navigateTo,
  role,
  teacherView,
  setTeacherView,
  currentUser,
  onLogout,
  notificationUnreadCount = 0,
}: SidebarProps) {
  const navRef = useRef<HTMLElement>(null);
  useTvNavigation(navRef, true);

  const getInitials = (name: string) => {
    if (!name) return "UN";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      } md:relative md:translate-x-0 transition-transform duration-200 ease-in-out flex flex-col`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <div
          onClick={() => {
            if (role === "student") navigateTo("dashboard");
            else setTeacherView("dashboard");
          }}
          className="flex items-center gap-3.5 cursor-pointer hover:opacity-95 transition-opacity"
        >
          <LogoSymbol className="w-12 h-12 text-indigo-400 flex-shrink-0" />
          <div className="flex flex-col select-none">
            <span className="text-lg font-black tracking-tight text-white leading-none">Axelmond</span>
            <span className="text-[10px] font-bold text-indigo-400 mt-1.5 uppercase tracking-widest leading-none">
              Research Labs
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden touch-target p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
          aria-label="Fermer le menu"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Authenticated role badge */}
      <div className="p-4 border-b border-slate-800 space-y-2 bg-slate-950/40">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Rôle authentifié</span>
        <div
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold ${
            role === "student"
              ? "bg-indigo-950/60 border-indigo-900/70 text-indigo-200"
              : getTeacherRoleBadgeTone(currentUser?.role) === "admin"
                ? "bg-violet-950/60 border-violet-900/70 text-violet-200"
                : getTeacherRoleBadgeTone(currentUser?.role) === "researcher"
                  ? "bg-amber-950/60 border-amber-900/70 text-amber-200"
                  : "bg-pink-950/60 border-pink-900/70 text-pink-200"
          }`}
        >
          {role === "student" ? <User className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          <span>{getRoleLabel(currentUser?.role)}</span>
        </div>
      </div>

      {/* Dynamic Navigation tabs depending on the active user role */}
      <nav
        ref={navRef}
        data-tv-zone="sidebar-nav"
        aria-label="Navigation principale"
        className="flex-1 p-4 space-y-1.5 overflow-y-auto"
      >
        {role === "student" ? (
          <>
            <button
              id="nav-dashboard"
              type="button"
              data-tv-focusable
              tabIndex={0}
              onMouseEnter={() => prefetchStudentView("dashboard")}
              onClick={() => navigateTo("dashboard")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                currentView === "dashboard"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Mon Espace (Études)
            </button>

            <button
              id="nav-profile"
              type="button"
              data-tv-focusable
              tabIndex={0}
              onMouseEnter={() => prefetchStudentView("profile")}
              onClick={() => navigateTo("profile")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                currentView === "profile"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <User className="w-5 h-5" />
              Mon Profil Étudiant
            </button>

            <button
              id="nav-catalog"
              type="button"
              data-tv-focusable
              tabIndex={0}
              onMouseEnter={() => prefetchStudentView("catalog")}
              onClick={() => navigateTo("catalog")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                currentView === "catalog"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              Catalogue des Modules
            </button>

            <button
              id="nav-study-schedule"
              type="button"
              data-tv-focusable
              tabIndex={0}
              onMouseEnter={() => prefetchStudentView("study-schedule")}
              onClick={() => navigateTo("study-schedule")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                currentView === "study-schedule"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <CalendarDays className="w-5 h-5 text-amber-300" />
              Mon Emploi du Temps d&apos;Étude
            </button>

            <button
              id="nav-objectives"
              type="button"
              data-tv-focusable
              tabIndex={0}
              onMouseEnter={() => prefetchStudentView("objectives")}
              onClick={() => navigateTo("objectives")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                currentView === "objectives"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Target className="w-5 h-5 text-cyan-300" />
              Objectifs
            </button>

            <button
              id="nav-messages"
              type="button"
              data-tv-focusable
              tabIndex={0}
              onMouseEnter={() => prefetchStudentView("messages")}
              onClick={() => navigateTo("messages")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                currentView === "messages"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <MessageSquare className="w-5 h-5 text-emerald-300" />
              Messagerie
            </button>

            <button
              id="nav-notifications"
              type="button"
              data-tv-focusable
              tabIndex={0}
              onMouseEnter={() => prefetchStudentView("notifications")}
              onClick={() => navigateTo("notifications")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                currentView === "notifications"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Bell className="w-5 h-5 text-rose-300" />
              <span className="flex-1 text-left">Notifications</span>
              {notificationUnreadCount > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                  {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                </span>
              )}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              data-tv-focusable
              tabIndex={0}
              aria-current={teacherView === "dashboard" ? "page" : undefined}
              onMouseEnter={() => prefetchTeacherView("dashboard")}
              onClick={() => setTeacherView("dashboard")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                teacherView === "dashboard"
                  ? "bg-pink-600 text-white shadow-md shadow-pink-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-5 h-5 text-pink-400" />
              {getTeacherSpaceTitle(currentUser?.role)}
            </button>

            <button
              type="button"
              data-tv-focusable
              tabIndex={0}
              aria-current={teacherView === "academic-profile" ? "page" : undefined}
              onMouseEnter={() => prefetchTeacherView("academic-profile")}
              onClick={() => setTeacherView("academic-profile")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                teacherView === "academic-profile"
                  ? "bg-pink-600 text-white shadow-md shadow-pink-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <User className="w-5 h-5 text-cyan-400" />
              Mon Profil Académique
            </button>

            <button
              type="button"
              data-tv-focusable
              tabIndex={0}
              aria-current={teacherView === "schedule" ? "page" : undefined}
              onMouseEnter={() => prefetchTeacherView("schedule")}
              onClick={() => setTeacherView("schedule")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                teacherView === "schedule"
                  ? "bg-pink-600 text-white shadow-md shadow-pink-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <CalendarDays className="w-5 h-5 text-amber-400" />
              Emploi du Temps
            </button>

            <button
              type="button"
              data-tv-focusable
              tabIndex={0}
              aria-current={teacherView === "curriculum" ? "page" : undefined}
              onMouseEnter={() => prefetchTeacherView("curriculum")}
              onClick={() => setTeacherView("curriculum")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                teacherView === "curriculum"
                  ? "bg-pink-600 text-white shadow-md shadow-pink-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Sliders className="w-5 h-5 text-purple-400" />
              Gestion des Contenus
            </button>

            <button
              type="button"
              data-tv-focusable
              tabIndex={0}
              aria-current={teacherView === "live-control" ? "page" : undefined}
              onMouseEnter={() => prefetchTeacherView("live-control")}
              onClick={() => setTeacherView("live-control")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                teacherView === "live-control"
                  ? "bg-pink-600 text-white shadow-md shadow-pink-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Video className="w-5 h-5 text-red-400" />
              Contrôleur de Modules Live
            </button>

            <button
              type="button"
              data-tv-focusable
              tabIndex={0}
              aria-current={teacherView === "messages" ? "page" : undefined}
              onMouseEnter={() => prefetchTeacherView("messages")}
              onClick={() => setTeacherView("messages")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                teacherView === "messages"
                  ? "bg-pink-600 text-white shadow-md shadow-pink-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Messagerie
            </button>

            <button
              type="button"
              data-tv-focusable
              tabIndex={0}
              aria-current={teacherView === "notifications" ? "page" : undefined}
              onMouseEnter={() => prefetchTeacherView("notifications")}
              onClick={() => setTeacherView("notifications")}
              className={`kbd-nav-focus touch-target flex items-center w-full gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                teacherView === "notifications"
                  ? "bg-pink-600 text-white shadow-md shadow-pink-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Bell className="w-5 h-5 text-rose-400" />
              <span className="flex-1 text-left">Notifications</span>
              {notificationUnreadCount > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                  {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                </span>
              )}
            </button>
          </>
        )}
      </nav>

      {/* Bottom user card based on role selection */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-950/20">
        <div
          onClick={() => {
            if (role === "student") navigateTo("profile");
            else setTeacherView("academic-profile");
          }}
          className="flex items-center gap-3 overflow-hidden cursor-pointer hover:opacity-85 transition-opacity flex-1"
        >
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold relative text-sm text-slate-200 flex-shrink-0 overflow-hidden">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Photo de profil" className="w-full h-full object-cover" />
            ) : currentUser ? (
              getInitials(currentUser.fullName)
            ) : (
              "AR"
            )}
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-slate-900 rounded-full ${
                role === "student" ? "bg-emerald-500" : "bg-red-500 animate-pulse"
              }`}
            ></div>
          </div>
          <div className="truncate flex-1">
            <p className="text-xs font-extrabold text-slate-200 truncate leading-none">
              {currentUser ? currentUser.fullName : "Axelmond Research Labs"}
            </p>
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider leading-tight mt-1.5 block truncate">
              {role === "student"
                ? currentUser?.filiere || DEFAULT_STUDENT_LABEL
                : currentUser?.levelOrTitle || "Titulaire Chaire"}
            </span>
          </div>
        </div>

        {/* LOGOUT BUTTON ACTION */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLogout();
          }}
          title="Se déconnecter"
          className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all cursor-pointer flex-shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
