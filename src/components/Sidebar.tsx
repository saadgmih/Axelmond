import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  LogOut,
  MessageCircle,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
} from "lucide-react";
import type { Course } from "../types";
import { AppUser } from "./AuthScreen";
import LogoSymbol from "./LogoSymbol";
import { LayoutFloatingToggle } from "./LayoutFloatingToggle";
import { useTvNavigation } from "../hooks/useTvNavigation";
import { useSidebarConversations } from "../hooks/useSidebarConversations";
import { useSidebarLayout } from "../hooks/useSidebarLayout";
import {
  getSidebarNavGroups,
  type SidebarNavContext,
  type SidebarNavGroup,
  type SidebarNavItem,
} from "../navigation/sidebar-config";
import { SidebarNavButton } from "./sidebar/SidebarNavButton";
import AccessibilityControls from "./AccessibilityControls";
import { UserProfileTrigger } from "./UserProfileViewer";

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
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
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
  const navGroups = useMemo(() => getSidebarNavGroups(role, currentUser?.role), [role, currentUser?.role]);

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

  const reservedWidth = isDocked && isDockedVisible ? "var(--sidebar-expanded-width)" : "0px";

  const renderNavItems = (items: SidebarNavItem[]) =>
    items.map((item) => {
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

  const messageUnreadCount = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
  const communicationUnreadCount = messageUnreadCount + notificationUnreadCount;
  const isMessagesActive = role === "student" ? currentView === "messages" : teacherView === "messages";

  const renderMessages = () => (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <SidebarNavButton
            id="nav-messages"
            label="Messages"
            icon={MessageCircle}
            iconClassName="text-teal-300"
            active={isMessagesActive}
            accent={role}
            badge={messageUnreadCount}
            onClick={openMessages}
          />
        </div>
        <button
          type="button"
          onClick={openMessages}
          aria-label="Nouvelle conversation"
          className="kbd-nav-focus touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {conversations.length > 0 && (
        <div className="space-y-1 border-l border-teal-400/20 pl-3">
          {conversations.map((conversation) => {
            const peerName = conversation.peer?.fullName || "Contact";
            const initials = getInitials(peerName);
            return (
              <div
                key={conversation.id}
                className="relative flex w-full items-center gap-1 rounded-xl hover:bg-white/5"
              >
                <UserProfileTrigger
                  userId={conversation.peer?.id}
                  userName={peerName}
                  className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-slate-300 hover:text-emerald-200"
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
                </UserProfileTrigger>
                <button
                  type="button"
                  onClick={openMessages}
                  aria-label={`Ouvrir la conversation avec ${peerName}`}
                  className="kbd-nav-focus flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white/10 hover:text-teal-300"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const toggleCategory = (categoryId: string) => {
    setOpenCategoryId((current) => (current === categoryId ? null : categoryId));
  };

  const renderCategory = (group: SidebarNavGroup) => {
    const isOpen = openCategoryId === group.id;
    const hasActiveItem = group.items.some((item) => item.isActive(navContext));
    const isActive = hasActiveItem || (group.id === "communication" && isMessagesActive);
    const badge = group.id === "communication" ? communicationUnreadCount : 0;
    const onboardingTarget = group.id === "communication" ? "messages" : undefined;
    const contentId = `sidebar-category-${group.id}-content`;
    const GroupIcon = group.icon;

    return (
      <section key={group.id} className="space-y-1" data-sidebar-category={group.id}>
        <button
          id={`sidebar-category-${group.id}`}
          type="button"
          data-tv-focusable
          data-onboarding={onboardingTarget}
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => toggleCategory(group.id)}
          className={`kbd-nav-focus touch-target flex min-h-[46px] w-full items-center gap-2 rounded-xl border px-3 py-3 text-left transition-all ${
            isOpen
              ? "border-teal-400/25 bg-teal-400/10 text-white"
              : isActive
                ? "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-200"
                : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
          }`}
        >
          <GroupIcon className={`h-5 w-5 shrink-0 ${isOpen || isActive ? "text-teal-300" : "text-slate-500"}`} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{group.label}</span>
          {badge > 0 && (
            <span className="rounded-full bg-teal-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180 text-teal-300" : ""}`}
            aria-hidden="true"
          />
        </button>
        {isOpen && (
          <div id={contentId} className="space-y-1 border-l border-teal-400/20 pb-1 pl-2" data-category-content>
            {renderNavItems(group.items)}
            {group.id === "communication" && renderMessages()}
          </div>
        )}
      </section>
    );
  };

  const renderPreferencesCategory = () => {
    const isOpen = openCategoryId === "preferences";
    const contentId = "sidebar-category-preferences-content";

    return (
      <section className="space-y-1" data-sidebar-category="preferences">
        <button
          id="sidebar-category-preferences"
          type="button"
          data-tv-focusable
          data-onboarding="platform-settings"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => toggleCategory("preferences")}
          className={`kbd-nav-focus touch-target flex min-h-[46px] w-full items-center gap-2 rounded-xl border px-3 py-3 text-left transition-all ${
            isOpen
              ? "border-teal-400/25 bg-teal-400/10 text-white"
              : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Settings2 className={`h-5 w-5 shrink-0 ${isOpen ? "text-teal-300" : "text-slate-500"}`} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold">Préférences</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180 text-teal-300" : ""}`}
            aria-hidden="true"
          />
        </button>
        {isOpen && (
          <div id={contentId} className="border-l border-teal-400/20 pb-1 pl-2" data-category-content>
            <AccessibilityControls
              labeled
              onRestartTutorial={onRestartTutorial}
              onOpenNotifications={openNotifications}
              notificationUnreadCount={notificationUnreadCount}
              activeView={role === "student" ? currentView : teacherView}
            />
          </div>
        )}
      </section>
    );
  };

  const renderUserFooter = () => (
    <div className="sidebar-glass-section border-t border-white/10 p-4" data-onboarding="sidebar-profile">
      <UserProfileTrigger
        userId={currentUser?.id}
        userName={currentUser?.fullName || "Performance Académique"}
        dataOnboarding="profile-menu"
        className="kbd-nav-focus group flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-xl px-1 py-1 text-left transition-colors hover:bg-white/5"
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
      </UserProfileTrigger>
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
        {navGroups.map(renderCategory)}
        {renderPreferencesCategory()}
      </nav>

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
