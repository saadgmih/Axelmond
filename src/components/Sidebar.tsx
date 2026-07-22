import { useEffect, useMemo, useRef } from "react";
import { BadgeCheck, LogOut, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { Course } from "../types";
import { AppUser } from "./AuthScreen";
import LogoSymbol from "./LogoSymbol";
import { LayoutFloatingToggle } from "./LayoutFloatingToggle";
import { useTvNavigation } from "../hooks/useTvNavigation";
import { useSidebarConversations } from "../hooks/useSidebarConversations";
import { useSidebarLayout } from "../hooks/useSidebarLayout";
import { getSidebarNavItems, type SidebarNavContext } from "../navigation/sidebar-config";
import { SidebarNavButton } from "./sidebar/SidebarNavButton";
import AccessibilityControls from "./AccessibilityControls";

interface SidebarProps {
  currentView: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  navigateTo: (view: string, course?: Course | null) => void;
  role: "student" | "teacher";
  teacherView: string;
  setTeacherView: (view: string) => void;
  currentUser: AppUser | null;
  onLogout: () => void;
  onRestartTutorial?: () => void;
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

function getAccessLabel(role: "student" | "teacher", userRole?: AppUser["role"]) {
  if (role === "student") return "Accès étudiant";
  if (userRole === "ADMIN") return "Accès administrateur";
  return "Accès professeur";
}

export default function Sidebar({
  currentView,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  navigateTo,
  role,
  teacherView,
  setTeacherView,
  currentUser,
  onLogout,
  onRestartTutorial,
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
  const navItems = useMemo(() => getSidebarNavItems(role, currentUser?.role), [role, currentUser?.role]);

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

  const openNotifications = () => {
    if (role === "student") navigateTo("notifications");
    else setTeacherView("notifications");
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
    <div className="px-4 py-3" data-onboarding="messages">
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
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-teal-400" />
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
    <div className="sidebar-glass-section border-t border-white/10 p-4" data-onboarding="sidebar-profile">
      <button
        type="button"
        onClick={goProfile}
        data-onboarding="profile-menu"
        className="kbd-nav-focus group flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-xl px-1 py-1 text-left transition-colors hover:bg-white/5"
        aria-label={currentUser ? `Profil de ${currentUser.fullName}` : "Profil utilisateur"}
      >
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[9px] font-bold uppercase tracking-[0.16em] text-teal-300/80">
            Utilisateur actuel
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-1.5">
            <span className="truncate text-xs font-black leading-none text-slate-100">
              {currentUser?.fullName || "Performance Académique"}
            </span>
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-teal-400" aria-hidden="true" />
          </span>
          <span className="mt-1.5 block truncate text-[10px] font-medium leading-none text-slate-400">
            {getAccessLabel(role, currentUser?.role)}
          </span>
        </div>

        <div className="sidebar-current-user-avatar">
          {currentUser?.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt="" className="sidebar-current-user-avatar-image object-cover" />
          ) : currentUser ? (
            <span className="sidebar-current-user-avatar-fallback">{getInitials(currentUser.fullName)}</span>
          ) : (
            <span className="sidebar-current-user-avatar-fallback">PA</span>
          )}
          <span className="sidebar-current-user-online" aria-hidden="true" />
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
        className="kbd-nav-focus ml-auto mt-1.5 flex min-h-7 items-center gap-1.5 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 transition-all hover:bg-white/5 hover:text-emerald-400"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        Se déconnecter
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

  const floatingSidebarToggle = canToggleSidebar ? (
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
  ) : null;

  const renderSidebarPanel = () => (
    <>
      <div className="sidebar-glass-section border-b border-white/10 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-3.5 transition-opacity hover:opacity-95"
            aria-label="Accueil Performance Académique"
          >
            <LogoSymbol className="h-11 w-11 shrink-0 text-emerald-400" />
            <div className="select-none text-left">
              <span className="block text-lg font-black leading-none tracking-tight text-white">Performance</span>
              <span className="mt-1.5 block text-[10px] font-bold uppercase leading-none tracking-[0.24em] text-emerald-300">
                Académique
              </span>
            </div>
          </button>
        </div>
      </div>

      <nav
        ref={navRef}
        data-tv-zone="sidebar-nav"
        aria-label="Navigation principale"
        className="sidebar-nav-scroll flex-1 space-y-1.5 overflow-y-auto px-4 py-4"
      >
        {renderNavItems()}
        <div data-onboarding="platform-settings">
          <AccessibilityControls
            labeled
            onRestartTutorial={onRestartTutorial}
            onOpenNotifications={openNotifications}
            notificationUnreadCount={notificationUnreadCount}
            activeView={role === "student" ? currentView : teacherView}
          />
        </div>
      </nav>

      {renderMessages()}
      {renderUserFooter()}
    </>
  );

  if (isDrawer) {
    return (
      <>
        {floatingSidebarToggle}
        <div className="sidebar-shell sidebar-shell-drawer relative z-[80] h-full w-0 shrink-0">
          <aside
            className={`sidebar-glass sidebar-drawer fixed z-[80] flex h-full w-[var(--sidebar-expanded-width)] flex-col text-white transition-transform duration-300 ease-out ${
              isMobileMenuOpen ? "translate-x-0" : "pointer-events-none -translate-x-[calc(100%+1.5rem)]"
            }`}
            aria-label="Barre latérale de navigation"
            aria-hidden={!isMobileMenuOpen}
          >
            {renderSidebarPanel()}
          </aside>
        </div>
      </>
    );
  }

  return (
    <>
      {floatingSidebarToggle}
      <div className="sidebar-shell relative z-50 h-full shrink-0" style={{ width: reservedWidth }}>
        {isDockedVisible && (
          <aside
            className="sidebar-glass relative flex h-full w-[var(--sidebar-expanded-width)] flex-col text-white lg:relative"
            aria-label="Barre latérale de navigation"
            aria-expanded={true}
          >
            {renderSidebarPanel()}
          </aside>
        )}
      </div>
    </>
  );
}
