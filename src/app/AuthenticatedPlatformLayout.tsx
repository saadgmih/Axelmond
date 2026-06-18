import { Suspense } from "react";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import SkipLink from "../components/SkipLink";
import KeyboardShortcutsHelp from "../components/KeyboardShortcutsHelp";
import { useSidebarLayout } from "../hooks/useSidebarLayout";
import { INSTITUTIONAL_VIEWS } from "../navigation/platformPaths";
import InstitutionalViewSwitch from "../views/InstitutionalViewSwitch";
import { LazyLiveKitSessionHost, LazyPaymentModal } from "../lazyViews";
import {
  usePlatformBindings,
  usePlatformCatalog,
  usePlatformLive,
  usePlatformNavigation,
  usePlatformSession,
  usePlatformUi,
} from "./platform-app-slices";
import { StudentRouteSwitch } from "./StudentRouteSwitch";
import { TeacherRouteSwitch } from "./TeacherRouteSwitch";
import { AppFooter } from "./AppFooter";

export function AuthenticatedPlatformLayout() {
  const session = usePlatformSession();
  const catalog = usePlatformCatalog();
  const navigation = usePlatformNavigation();
  const live = usePlatformLive();
  const ui = usePlatformUi();
  const bindings = usePlatformBindings();
  const currentView = navigation.currentView;
  const { isDrawer } = useSidebarLayout();

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-950 font-sans">
      {live.needsLiveKitSession && session.currentUser && (
        <Suspense fallback={null}>
          <LazyLiveKitSessionHost
            activeLiveCourse={live.activeLiveCourse}
            setActiveLiveCourse={live.setActiveLiveCourse}
            currentUser={session.currentUser}
            courses={catalog.courses}
            liveCourseId={live.liveCourseId}
            setSelectedCourse={navigation.setSelectedCourse}
            setTeacherView={navigation.setTeacherView}
            setCurrentView={navigation.setCurrentView}
            setCourseToPurchase={ui.setCourseToPurchase}
            updateSessionUser={session.updateSessionUser}
            setEnrolledCourses={session.setEnrolledCourses}
            setInvoices={session.setInvoices}
            getInitials={catalog.getInitials}
            navigateTo={navigation.navigateTo}
            currentView={currentView}
            teacherView={navigation.teacherView}
            handleToggleCourseLive={live.handleToggleCourseLive}
            onStudentLiveEnded={live.handleStudentLiveEnded}
            roomRef={live.roomRef}
          />
        </Suspense>
      )}

      <SkipLink />

      <Sidebar
        currentView={currentView}
        enrolledCourses={session.enrolledCourses}
        isMobileMenuOpen={ui.isMobileMenuOpen}
        courses={catalog.courses}
        setIsMobileMenuOpen={ui.setIsMobileMenuOpen}
        navigateTo={navigation.navigateTo}
        role={session.role}
        teacherView={navigation.teacherView}
        setTeacherView={navigation.handleTeacherViewChange}
        currentUser={session.currentUser!}
        onLogout={session.handleLogout}
        notificationUnreadCount={session.notificationUnreadCount}
        isSidebarCollapsed={ui.isSidebarCollapsed}
        onToggleSidebarCollapsed={ui.toggleSidebarCollapsed}
      />

      {ui.isMobileMenuOpen &&
        isDrawer &&
        createPortal(
          <button
            type="button"
            aria-label="Fermer le menu de navigation"
            className="sidebar-drawer-backdrop fixed inset-0 z-[60]"
            onClick={() => ui.setIsMobileMenuOpen(false)}
          />,
          document.body,
        )}

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {!live.isStudentLive && (
          <Topbar
            currentView={currentView}
            searchQuery={catalog.searchQuery}
            setSearchQuery={catalog.setSearchQuery}
            enrolledCourses={session.enrolledCourses}
            courses={catalog.courses}
            navigateTo={navigation.navigateTo}
            role={session.role}
            currentUser={session.currentUser!}
            catalogSearchRef={catalog.catalogSearchRef}
            notificationUnreadCount={session.notificationUnreadCount}
            onOpenNotifications={session.openNotificationsView}
            activeView={session.role === "teacher" ? navigation.teacherView : currentView}
            onTeacherNavigate={navigation.handleTeacherViewChange}
            isTopbarCollapsed={ui.isTopbarCollapsed}
            onToggleTopbarCollapsed={ui.toggleTopbarCollapsed}
          />
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 relative bg-slate-950 outline-none min-h-0 ${ui.lockMainScroll ? "overflow-hidden" : "overflow-y-auto"}`}
        >
          {INSTITUTIONAL_VIEWS.has(currentView) ? (
            <InstitutionalViewSwitch
              currentView={currentView}
              currentUser={session.currentUser!}
              navigateTo={navigation.navigateTo}
            />
          ) : session.role === "teacher" ? (
            <TeacherRouteSwitch />
          ) : (
            <StudentRouteSwitch />
          )}

          {/* Global Footer */}
          {!ui.hideGlobalFooter && <AppFooter />}
        </main>
      </div>

      {ui.courseToPurchase && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          }
        >
          <LazyPaymentModal
            course={ui.courseToPurchase}
            onClose={() => ui.setCourseToPurchase(null)}
            onSuccess={bindings.handlePaymentSuccess}
          />
        </Suspense>
      )}

      {live.activeLiveCourse &&
        !(
          (session.role === "student" && currentView === "live") ||
          (session.role === "teacher" && navigation.teacherView === "live-control")
        ) && (
          <button
            type="button"
            aria-label={`Rejoindre le live actif : ${live.activeLiveCourse.title}`}
            onClick={() => {
              navigation.setSelectedCourse(live.activeLiveCourse);
              live.setLiveCourseId(live.activeLiveCourse!.id);
              if (session.role === "student") {
                navigation.setCurrentView("live");
              } else {
                navigation.setTeacherView("live-control");
              }
              ui.setIsMobileMenuOpen(false);
            }}
            className="fixed right-4 bottom-4 sm:right-5 sm:bottom-5 z-50 bg-slate-950 border border-indigo-500/50 text-white rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-[min(280px,calc(100vw-2rem))] text-left cursor-pointer hover:bg-slate-900 transition-colors touch-target kbd-nav-focus"
          >
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-widest text-indigo-300">Live actif</span>
              <span className="block text-xs font-bold truncate">{live.activeLiveCourse.title}</span>
            </span>
          </button>
        )}

      <KeyboardShortcutsHelp open={ui.showKeyboardHelp} onClose={() => ui.setShowKeyboardHelp(false)} />
    </div>
  );
}
