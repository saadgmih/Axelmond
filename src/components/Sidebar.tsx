import { useEffect, useMemo, useRef } from "react";
import { LogOut, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Course, DEFAULT_STUDENT_LABEL } from "../types";
import { AppUser } from "./AuthScreen";
import { getRoleLabel, getTeacherRoleBadgeTone } from "../rbac";
import LogoSymbol from "./LogoSymbol";
import { LayoutFloatingToggle } from "./LayoutFloatingToggle";
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
  const { isDocked, isDrawer } = useSidebarLayout();
  useTvNavigation(navRef, true);

  const canToggleSidebar = Boolean(onToggleSidebarCollapsed);
  const isDockedHidden = !isDrawer && canToggleSidebar && isSidebarCollapsed;
  const isDockedVisible = !isDrawer && !isDockedHidden;

  useEffect(() => {
    if (!isDrawer || !isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDrawer, isMobileMenuOpen]);

  const conversations = useSidebarConversations(
    Boolean(currentUser) && (isDrawer ? isMobileMenuOpen : isDockedVisible),
  );
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

  const closeDrawer = () => {
    setIsMobileMenuOpen(false);
  };

  const hideSidebarAfterAction = () => {
    if (isDrawer) {
      closeDrawer();
    }
  };

  const openMessages = () => {
    if (role === "student") navigateTo("messages");
    else setTeacherView("messages");
    hideSidebarAfterAction();
  };

  const goHome = () => {
    if (role === "student") navigateTo("dashboard");
    else setTeacherView("dashboard");
    hideSidebarAfterAction();
  };

  const goProfile = () => {
    if (role === "student") navigateTo("profile");
    else setTeacherView("academic-profile");
    hideSidebarAfterAction();
  };

  const reservedWidth = isDocked && isDockedVisible ? "var(--sidebar-expanded-width)" : "0px";

  const renderNavItems = () =>
    navItems.map((item) => {
      const badge = item.id === "nav-notifications" ? notificationUnreadCount : undefined;
      return (
        <SidebarNavButton
          key={item.id}
          id={item.id}
          label={item.label}
          icon={item.icon}
          iconClassName={item.iconClassName}
          active={item.isActive(navContext)}
          accent={role}
          compact={false}
          badge={badge}
          onMouseEnter={item.prefetch}
          onClick={() => {
            if (isDrawer) {
              closeDrawer();
            }
            item.onSelect(navContext);
          }}
        />
      );
    });

  const renderMessages = () => (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Messages</span>
        <button
          type="button"
          onClick={openMessages}
          aria-label="Nouvelle conversation"
          className="touch-target flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {conversations.length > 0 && (
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
    <div className="sidebar-glass-section flex items-center justify-between gap-2 border-t border-white/10 p-4">
      <button
        type="button"
        onClick={goProfile}
        className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden transition-opacity hover:opacity-85"
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
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500" />
        </div>
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
      </button>
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
    </div>
  );

  const handleSidebarToggle = () => {
    if (isDrawer) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
      return;
    }
    onToggleSidebarCollapsed?.();
  };

  const sidebarToggleIcon = isDrawer ? (
    isMobileMenuOpen ? (
      <PanelLeftClose className="layout-collapse-toggle-icon" aria-hidden="true" />
    ) : (
      <PanelLeftOpen className="layout-collapse-toggle-icon" aria-hidden="true" />
    )
  ) : isDockedHidden ? (
    <PanelLeftOpen className="layout-collapse-toggle-icon" aria-hidden="true" />
  ) : (
    <PanelLeftClose className="layout-collapse-toggle-icon" aria-hidden="true" />
  );

  const sidebarToggleLabel = isDrawer
    ? isMobileMenuOpen
      ? "Fermer la barre latérale"
      : "Ouvrir la barre latérale"
    : isDockedHidden
      ? "Afficher la barre latérale"
      : "Masquer la barre latérale";

  const sidebarToggleButton = (variant: "hidden" | "attached") => {
    if (!canToggleSidebar) return null;

    if (variant === "hidden") {
      return (
        <LayoutFloatingToggle
          anchor="sidebar"
          storageKey="axelmond_sidebar_toggle_position"
          ariaLabel={sidebarToggleLabel}
          ariaPressed={isDrawer ? isMobileMenuOpen : isDockedHidden}
          title="Glisser pour déplacer, cliquer pour basculer la barre latérale"
          onActivate={handleSidebarToggle}
          className="sidebar-collapse-toggle"
        >
          {sidebarToggleIcon}
        </LayoutFloatingToggle>
      );
    }

    return (
      <button
        type="button"
        onClick={handleSidebarToggle}
        className="layout-collapse-toggle sidebar-collapse-toggle sidebar-collapse-toggle--attached kbd-nav-focus"
        aria-label={sidebarToggleLabel}
        aria-pressed={isDrawer ? isMobileMenuOpen : isDockedHidden}
      >
        {sidebarToggleIcon}
      </button>
    );
  };

  const renderSidebarPanel = (mode: "drawer" | "docked") => (
    <>
      <div className="sidebar-glass-section border-b border-white/10 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-3.5 transition-opacity hover:opacity-95"
            aria-label="Accueil Axelmond Research Labs"
          >
            <LogoSymbol className="h-11 w-11 shrink-0 text-indigo-400" />
            <div className="select-none text-left">
              <span className="block text-lg font-black leading-none tracking-tight text-white">Axelmond</span>
              <span className="mt-1.5 block text-[10px] font-bold uppercase leading-none tracking-[0.24em] text-indigo-300">
                Research Labs
              </span>
            </div>
          </button>
        </div>
      </div>

      <div className="sidebar-glass-section space-y-2 border-b border-white/10 px-4 py-4">
        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Rôle authentifié
        </span>
        <div className="relative">
          <div
            className={`flex items-center gap-2 rounded-xl border py-2 pl-3 pr-2 text-xs font-bold ${roleBadgeClass(role, currentUser?.role)}`}
          >
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
              <RoleIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 leading-none">{getRoleLabel(currentUser?.role)}</span>
          </div>
          {sidebarToggleButton("attached")}
        </div>
      </div>

      <nav
        ref={navRef}
        data-tv-zone="sidebar-nav"
        aria-label="Navigation principale"
        className="sidebar-nav-scroll flex-1 space-y-1.5 overflow-y-auto px-4 py-4"
      >
        {renderNavItems()}
      </nav>

      {renderMessages()}
      {renderUserFooter()}
    </>
  );

  if (isDrawer) {
    return (
      <>
        {!isMobileMenuOpen && sidebarToggleButton("hidden")}
        <div className="sidebar-shell sidebar-shell-drawer relative z-[80] h-full w-0 shrink-0">
          <aside
            className={`sidebar-glass sidebar-drawer fixed z-[80] flex h-full w-[var(--sidebar-expanded-width)] flex-col text-white transition-transform duration-300 ease-out ${
              isMobileMenuOpen ? "translate-x-0" : "pointer-events-none -translate-x-[calc(100%+1.5rem)]"
            }`}
            aria-label="Barre latérale de navigation"
            aria-hidden={!isMobileMenuOpen}
          >
            {renderSidebarPanel("drawer")}
          </aside>
        </div>
      </>
    );
  }

  return (
    <div className="sidebar-shell relative z-50 h-full shrink-0" style={{ width: reservedWidth }}>
      {isDockedHidden && sidebarToggleButton("hidden")}
      {isDockedVisible && (
        <aside
          className="sidebar-glass relative flex h-full w-[var(--sidebar-expanded-width)] flex-col text-white lg:relative"
          aria-label="Barre latérale de navigation"
          aria-expanded={true}
        >
          {renderSidebarPanel("docked")}
        </aside>
      )}
    </div>
  );
}
