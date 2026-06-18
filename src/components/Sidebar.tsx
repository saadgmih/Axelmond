import { useEffect, useMemo, useRef, useState } from "react";
import { X, LogOut, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Course, DEFAULT_STUDENT_LABEL } from "../types";
import { AppUser } from "./AuthScreen";
import { getRoleLabel, getTeacherRoleBadgeTone } from "../rbac";
import LogoSymbol from "./LogoSymbol";
import { useTvNavigation } from "../hooks/useTvNavigation";
import { useSidebarConversations } from "../hooks/useSidebarConversations";
import { useSidebarLayout } from "../hooks/useSidebarLayout";
import {
  getSidebarNavItems,
  getSidebarRoleIcon,
  type SidebarNavContext,
} from "../navigation/sidebar-config";
import { SidebarNavButton } from "./sidebar/SidebarNavButton";

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
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapsed?: () => void;
}

function getInitials(name: string) {
  if (!name) return "UN";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function roleBadgeClass(role: "student" | "teacher", userRole?: AppUser["role"]) {
  if (role === "student") {
    return "bg-indigo-500/10 border-indigo-400/20 text-indigo-200";
  }
  const tone = getTeacherRoleBadgeTone(userRole);
  if (tone === "admin") return "bg-violet-500/10 border-violet-400/20 text-violet-200";
  if (tone === "researcher") return "bg-amber-500/10 border-amber-400/20 text-amber-200";
  return "bg-pink-500/10 border-pink-400/20 text-pink-200";
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
  isSidebarCollapsed = false,
  onToggleSidebarCollapsed,
}: SidebarProps) {
  const navRef = useRef<HTMLElement>(null);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const { isDocked, isDrawer, isTvLike, isCoarsePointer } = useSidebarLayout();
  useTvNavigation(navRef, true);

  const effectiveCollapsed = isDocked && isSidebarCollapsed && !isTvLike;

  useEffect(() => {
    if (!effectiveCollapsed) {
      setIsHoverExpanded(false);
    }
  }, [effectiveCollapsed]);

  useEffect(() => {
    if (!isDrawer || !isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDrawer, isMobileMenuOpen]);

  const conversations = useSidebarConversations(Boolean(currentUser));
  const navItems = useMemo(
    () => getSidebarNavItems(role, currentUser?.role),
    [role, currentUser?.role],
  );
  const RoleIcon = getSidebarRoleIcon(role);

  const navContext: SidebarNavContext = {
    currentView,
    teacherView,
    navigateTo: (view) => navigateTo(view),
    setTeacherView,
  };

  const openMessages = () => {
    if (role === "student") navigateTo("messages");
    else setTeacherView("messages");
    setIsMobileMenuOpen(false);
  };

  const goHome = () => {
    if (role === "student") navigateTo("dashboard");
    else setTeacherView("dashboard");
    setIsMobileMenuOpen(false);
  };

  const goProfile = () => {
    if (role === "student") navigateTo("profile");
    else setTeacherView("academic-profile");
    setIsMobileMenuOpen(false);
  };

  const canHoverExpand = effectiveCollapsed && !isCoarsePointer && !isTvLike;
  const isCompact = effectiveCollapsed && !isHoverExpanded;
  const isHoverFlyout = canHoverExpand && isHoverExpanded;
  const showExpandedContent = !isCompact;
  const reservedWidth = isDocked
    ? effectiveCollapsed
      ? "var(--sidebar-collapsed-width)"
      : "var(--sidebar-expanded-width)"
    : "0px";

  const renderNavItems = () =>
    navItems.map((item) => {
      const badge = item.id === "nav-notifications" ? notificationUnreadCount : undefined;
      return (
        <SidebarNavButton
          key={item.id}
          id={isCompact ? undefined : item.id}
          label={item.label}
          icon={item.icon}
          iconClassName={item.iconClassName}
          active={item.isActive(navContext)}
          accent={role}
          compact={isCompact}
          badge={badge}
          onMouseEnter={item.prefetch}
          onClick={() => {
            item.onSelect(navContext);
            setIsMobileMenuOpen(false);
          }}
        />
      );
    });

  const renderMessages = () => (
    <div className={isCompact ? "px-2 py-2" : "px-4 py-3"}>
      <div className={`mb-2 flex items-center ${isCompact ? "justify-center" : "justify-between gap-2"}`}>
        {showExpandedContent && (
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Messages</span>
        )}
        <button
          type="button"
          onClick={openMessages}
          aria-label="Nouvelle conversation"
          className="touch-target flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {showExpandedContent && conversations.length > 0 && (
        <div className="space-y-1.5">
          {conversations.map((conversation) => {
            const peerName = conversation.peer?.fullName || "Contact";
            const initials = getInitials(peerName);
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={openMessages}
                aria-label={`Ouvrir la conversation avec ${peerName}`}
                className="relative flex w-full items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
              >
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-700/80 text-xs font-bold text-slate-200">
                  {conversation.peer?.avatarUrl ? (
                    <img src={conversation.peer.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">{initials}</span>
                  )}
                  {conversation.unreadCount > 0 && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-sky-400" />
                  )}
                </div>
                <span className="truncate text-sm font-medium text-slate-300">{peerName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderUserFooter = () => (
    <div
      className={`sidebar-glass-section border-t border-white/10 ${
        isCompact ? "flex flex-col items-center gap-2 p-3" : "flex items-center justify-between gap-2 p-4"
      }`}
    >
      <button
        type="button"
        onClick={goProfile}
        className={`flex min-w-0 items-center transition-opacity hover:opacity-85 ${
          isCompact ? "justify-center" : "flex-1 gap-3 overflow-hidden"
        }`}
        aria-label="Ouvrir le profil"
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-700/80 text-sm font-bold text-slate-200">
          {currentUser?.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : currentUser ? (
            <span className="flex h-full w-full items-center justify-center">{getInitials(currentUser.fullName)}</span>
          ) : (
            "AR"
          )}
          <span
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 ${
              role === "student" ? "bg-emerald-500" : "bg-red-500 animate-pulse"
            }`}
          />
        </div>
        {showExpandedContent && (
          <div className="min-w-0 flex-1 truncate text-left">
            <p className="truncate text-xs font-extrabold leading-none text-slate-100">
              {currentUser?.fullName || "Axelmond Research Labs"}
            </p>
            <span className="mt-1.5 block truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {role === "student"
                ? currentUser?.filiere || DEFAULT_STUDENT_LABEL
                : currentUser?.levelOrTitle || "Titulaire Chaire"}
            </span>
          </div>
        )}
      </button>
      {showExpandedContent && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onLogout();
          }}
          title="Se déconnecter"
          aria-label="Se déconnecter"
          className="touch-target shrink-0 rounded-xl p-2.5 text-slate-400 transition-all hover:bg-white/5 hover:text-rose-400"
        >
          <LogOut className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div
      className="relative z-50 h-full shrink-0"
      style={{ width: isDocked ? reservedWidth : undefined }}
      onMouseEnter={() => {
        if (canHoverExpand) setIsHoverExpanded(true);
      }}
      onMouseLeave={() => setIsHoverExpanded(false)}
    >
      <aside
        className={`sidebar-glass flex h-full flex-col text-white transition-[width,transform,box-shadow] duration-300 ease-out ${
          isCompact ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-expanded-width)]"
        } ${isHoverFlyout ? "sidebar-glass-flyout absolute left-0 top-0 z-[60] shadow-2xl" : ""} ${
          isDrawer ? "sidebar-drawer fixed inset-y-0 left-0 z-[70]" : "lg:relative"
        } ${isDrawer ? (isMobileMenuOpen ? "translate-x-0" : "-translate-x-full") : ""}`}
        aria-label="Barre latérale de navigation"
        aria-expanded={showExpandedContent}
        aria-hidden={isDrawer && !isMobileMenuOpen}
      >
        <div className={`sidebar-glass-section border-b border-white/10 ${isCompact ? "px-3 py-4" : "px-5 py-5"}`}>
          <div className={`flex items-center ${isCompact ? "justify-center" : "justify-between gap-3"}`}>
            <button
              type="button"
              onClick={goHome}
              className={`flex items-center transition-opacity hover:opacity-95 ${isCompact ? "" : "gap-3.5"}`}
              aria-label="Accueil Axelmond Research Labs"
            >
              <LogoSymbol className="h-11 w-11 shrink-0 text-indigo-400" />
              {showExpandedContent && (
                <div className="select-none text-left">
                  <span className="block text-lg font-black leading-none tracking-tight text-white">Axelmond</span>
                  <span className="mt-1.5 block text-[10px] font-bold uppercase leading-none tracking-[0.24em] text-indigo-300">
                    Research Labs
                  </span>
                </div>
              )}
            </button>
            {showExpandedContent && isDrawer && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="touch-target flex items-center justify-center rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label="Fermer le menu"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        <div className={`sidebar-glass-section border-b border-white/10 ${isCompact ? "px-2 py-3" : "space-y-2 px-4 py-4"}`}>
          {showExpandedContent && (
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Rôle authentifié
            </span>
          )}
          <div
            className={`flex items-center rounded-xl border text-xs font-bold ${
              isCompact ? "mx-auto justify-center px-2 py-2" : "gap-2 px-3 py-2.5"
            } ${roleBadgeClass(role, currentUser?.role)}`}
          >
            <RoleIcon className="h-3.5 w-3.5 shrink-0" />
            {showExpandedContent && <span>{getRoleLabel(currentUser?.role)}</span>}
          </div>
        </div>

        <nav
          ref={navRef}
          data-tv-zone="sidebar-nav"
          aria-label="Navigation principale"
          className={`sidebar-nav-scroll flex-1 overflow-y-auto ${isCompact ? "space-y-1 px-2 py-3" : "space-y-1.5 px-4 py-4"}`}
        >
          {renderNavItems()}
        </nav>

        {renderMessages()}
        {renderUserFooter()}

        {onToggleSidebarCollapsed && isDocked && !isTvLike && (
          <button
            type="button"
            onClick={() => {
              setIsHoverExpanded(false);
              onToggleSidebarCollapsed();
            }}
            className="absolute -right-3 top-20 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-slate-900/95 text-slate-300 shadow-lg backdrop-blur-md transition-colors hover:text-white"
            aria-label={effectiveCollapsed ? "Développer la barre latérale" : "Réduire la barre latérale"}
            aria-pressed={effectiveCollapsed}
          >
            {effectiveCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
          </button>
        )}
      </aside>
    </div>
  );
}
