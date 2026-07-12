import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookOpen,
  User,
  Shield,
  CalendarRange,
  Bell,
  CalendarDays,
  Sliders,
  Video,
  ShieldAlert,
  KeyRound,
  HandHeart,
} from "lucide-react";
import { getTeacherSpaceTitle } from "../rbac";
import type { UserRole } from "../rbac";
import { CHARITY_PAGE_SHORT } from "../charity-labels";
import { prefetchStudentView, prefetchTeacherView } from "../utils/prefetch";

export type SidebarAccent = "student" | "teacher";

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  iconClassName?: string;
  prefetch?: () => void;
  isActive: (ctx: SidebarNavContext) => boolean;
  onSelect: (ctx: SidebarNavContext) => void;
}

export interface SidebarNavContext {
  currentView: string;
  teacherView: string;
  navigateTo: (view: string) => void;
  setTeacherView: (view: string) => void;
}

function studentItems(): SidebarNavItem[] {
  return [
    {
      id: "nav-dashboard",
      label: "Mon Espace (Études)",
      icon: LayoutDashboard,
      prefetch: () => prefetchStudentView("dashboard"),
      isActive: ({ currentView }) => currentView === "dashboard",
      onSelect: ({ navigateTo }) => navigateTo("dashboard"),
    },
    {
      id: "nav-profile",
      label: "Mon Profil Étudiant",
      icon: User,
      prefetch: () => prefetchStudentView("profile"),
      isActive: ({ currentView }) => currentView === "profile",
      onSelect: ({ navigateTo }) => navigateTo("profile"),
    },
    {
      id: "nav-account-security",
      label: "Sécurité du compte",
      icon: Shield,
      iconClassName: "text-teal-300",
      prefetch: () => prefetchStudentView("account-security"),
      isActive: ({ currentView }) => currentView === "account-security",
      onSelect: ({ navigateTo }) => navigateTo("account-security"),
    },
    {
      id: "nav-catalog",
      label: "Catalogue des Modules",
      icon: BookOpen,
      prefetch: () => prefetchStudentView("catalog"),
      isActive: ({ currentView }) => currentView === "catalog",
      onSelect: ({ navigateTo }) => navigateTo("catalog"),
    },
    {
      id: "nav-study-plan",
      label: "Plan d'étude & Objectifs",
      icon: CalendarRange,
      iconClassName: "text-lime-300",
      prefetch: () => prefetchStudentView("study-plan"),
      isActive: ({ currentView }) =>
        currentView === "study-plan" || currentView === "study-schedule" || currentView === "objectives",
      onSelect: ({ navigateTo }) => navigateTo("study-plan"),
    },
    {
      id: "nav-charity",
      label: CHARITY_PAGE_SHORT,
      icon: HandHeart,
      iconClassName: "text-teal-300",
      prefetch: () => prefetchStudentView("charity"),
      isActive: ({ currentView }) => currentView === "charity",
      onSelect: ({ navigateTo }) => navigateTo("charity"),
    },
    {
      id: "nav-notifications",
      label: "Notifications",
      icon: Bell,
      iconClassName: "text-emerald-300",
      prefetch: () => prefetchStudentView("notifications"),
      isActive: ({ currentView }) => currentView === "notifications",
      onSelect: ({ navigateTo }) => navigateTo("notifications"),
    },
  ];
}

function teacherItems(role?: UserRole): SidebarNavItem[] {
  const spaceTitle = getTeacherSpaceTitle(role);
  const items: SidebarNavItem[] = [
    {
      id: "nav-teacher-dashboard",
      label: spaceTitle,
      icon: LayoutDashboard,
      iconClassName: "text-emerald-400",
      prefetch: () => prefetchTeacherView("dashboard"),
      isActive: ({ teacherView }) => teacherView === "dashboard",
      onSelect: ({ setTeacherView }) => setTeacherView("dashboard"),
    },
    {
      id: "nav-academic-profile",
      label: "Mon Profil Académique",
      icon: User,
      iconClassName: "text-teal-400",
      prefetch: () => prefetchTeacherView("academic-profile"),
      isActive: ({ teacherView }) => teacherView === "academic-profile",
      onSelect: ({ setTeacherView }) => setTeacherView("academic-profile"),
    },
    {
      id: "nav-account-security",
      label: "Sécurité du compte",
      icon: Shield,
      iconClassName: "text-teal-300",
      prefetch: () => prefetchTeacherView("account-security"),
      isActive: ({ teacherView }) => teacherView === "account-security",
      onSelect: ({ setTeacherView }) => setTeacherView("account-security"),
    },
    {
      id: "nav-schedule",
      label: "Emploi du Temps",
      icon: CalendarDays,
      iconClassName: "text-lime-400",
      prefetch: () => prefetchTeacherView("schedule"),
      isActive: ({ teacherView }) => teacherView === "schedule",
      onSelect: ({ setTeacherView }) => setTeacherView("schedule"),
    },
    {
      id: "nav-curriculum",
      label: "Gestion des Contenus",
      icon: Sliders,
      iconClassName: "text-teal-400",
      prefetch: () => prefetchTeacherView("curriculum"),
      isActive: ({ teacherView }) => teacherView === "curriculum",
      onSelect: ({ setTeacherView }) => setTeacherView("curriculum"),
    },
    {
      id: "nav-live-control",
      label: "Contrôleur de Modules Live",
      icon: Video,
      iconClassName: "text-red-400",
      prefetch: () => prefetchTeacherView("live-control"),
      isActive: ({ teacherView }) => teacherView === "live-control",
      onSelect: ({ setTeacherView }) => setTeacherView("live-control"),
    },
    {
      id: "nav-charity",
      label: CHARITY_PAGE_SHORT,
      icon: HandHeart,
      iconClassName: "text-teal-300",
      prefetch: () => prefetchTeacherView("charity"),
      isActive: ({ teacherView }) => teacherView === "charity",
      onSelect: ({ setTeacherView }) => setTeacherView("charity"),
    },
    {
      id: "nav-notifications",
      label: "Notifications",
      icon: Bell,
      iconClassName: "text-emerald-400",
      prefetch: () => prefetchTeacherView("notifications"),
      isActive: ({ teacherView }) => teacherView === "notifications",
      onSelect: ({ setTeacherView }) => setTeacherView("notifications"),
    },
  ];

  if (role === "ADMIN") {
    items.splice(2, 0, {
      id: "nav-professor-access-keys",
      label: "Codes d'accès professeur",
      icon: KeyRound,
      iconClassName: "text-emerald-400",
      prefetch: () => prefetchTeacherView("access-keys"),
      isActive: ({ teacherView }) => teacherView === "access-keys",
      onSelect: ({ setTeacherView }) => setTeacherView("access-keys"),
    });
  }

  return items;
}

export function getSidebarNavItems(role: "student" | "teacher", userRole?: UserRole): SidebarNavItem[] {
  return role === "student" ? studentItems() : teacherItems(userRole);
}

export function getSidebarRoleIcon(role: "student" | "teacher") {
  return role === "student" ? User : ShieldAlert;
}
