import { Suspense } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import SkipLink from "../components/SkipLink";
import KeyboardShortcutsHelp from "../components/KeyboardShortcutsHelp";
import { INSTITUTIONAL_VIEWS } from "../navigation/platformPaths";
import InstitutionalViewSwitch from "../views/InstitutionalViewSwitch";
import { LazyLiveKitSessionHost, LazyPaymentModal } from "../lazyViews";
import { usePlatformAppContext } from "./platform-app-context";
import { StudentRouteSwitch } from "./StudentRouteSwitch";
import { TeacherRouteSwitch } from "./TeacherRouteSwitch";
import { AppFooter } from "./AppFooter";

export function AuthenticatedPlatformLayout() {
  const platform = usePlatformAppContext();

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] bg-slate-50 font-sans overflow-hidden">
      {platform.needsLiveKitSession && platform.currentUser && (
        <Suspense fallback={null}>
          <LazyLiveKitSessionHost
            activeLiveCourse={platform.activeLiveCourse}
            setActiveLiveCourse={platform.setActiveLiveCourse}
            currentUser={platform.currentUser}
            courses={platform.courses}
            liveCourseId={platform.liveCourseId}
            setSelectedCourse={platform.setSelectedCourse}
            setTeacherView={platform.setTeacherView}
            setCurrentView={platform.setCurrentView}
            setCourseToPurchase={platform.setCourseToPurchase}
            updateSessionUser={platform.updateSessionUser}
            setEnrolledCourses={platform.setEnrolledCourses}
            setInvoices={platform.setInvoices}
            getInitials={platform.getInitials}
            navigateTo={platform.navigateTo}
            currentView={platform.currentView}
            teacherView={platform.teacherView}
            handleToggleCourseLive={platform.handleToggleCourseLive}
          />
        </Suspense>
      )}

      <SkipLink />

      {platform.isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Fermer le menu de navigation"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] md:hidden"
          onClick={() => platform.setIsMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        currentView={platform.currentView}
        enrolledCourses={platform.enrolledCourses}
        isMobileMenuOpen={platform.isMobileMenuOpen}
        courses={platform.courses}
        setIsMobileMenuOpen={platform.setIsMobileMenuOpen}
        navigateTo={platform.navigateTo}
        role={platform.role}
        teacherView={platform.teacherView}
        setTeacherView={platform.handleTeacherViewChange}
        currentUser={platform.currentUser!}
        onLogout={platform.handleLogout}
        notificationUnreadCount={platform.notificationUnreadCount}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {!platform.isStudentLive && (
          <Topbar
            currentView={platform.currentView}
            searchQuery={platform.searchQuery}
            setSearchQuery={platform.setSearchQuery}
            enrolledCourses={platform.enrolledCourses}
            courses={platform.courses}
            navigateTo={platform.navigateTo}
            role={platform.role}
            currentUser={platform.currentUser!}
            onToggleMobileMenu={() => platform.setIsMobileMenuOpen(!platform.isMobileMenuOpen)}
            catalogSearchRef={platform.catalogSearchRef}
            notificationUnreadCount={platform.notificationUnreadCount}
            onOpenNotifications={platform.openNotificationsView}
            activeView={platform.role === "teacher" ? platform.teacherView : platform.currentView}
          />
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 relative bg-slate-50 outline-none min-h-0 ${platform.lockMainScroll ? "overflow-hidden" : "overflow-y-auto"}`}
        >
          {INSTITUTIONAL_VIEWS.has(platform.currentView) ? (
            <InstitutionalViewSwitch
              currentView={platform.currentView}
              currentUser={platform.currentUser!}
              navigateTo={platform.navigateTo}
            />
          ) : platform.role === "teacher" ? (
            <TeacherRouteSwitch />
          ) : (
            <StudentRouteSwitch />
          )}

          {!platform.hideGlobalFooter && (
            <>
              {/* Global Footer — scroll avec le contenu de la page */}
              <AppFooter />
            </>
          )}
        </main>
      </div>

      {platform.courseToPurchase && (
        <Suspense fallback={<div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"><div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></div>}>
          <LazyPaymentModal
            course={platform.courseToPurchase}
            onClose={() => platform.setCourseToPurchase(null)}
            onSuccess={platform.handlePaymentSuccess}
          />
        </Suspense>
      )}

      {platform.activeLiveCourse && !((platform.role === "student" && platform.currentView === "live") || (platform.role === "teacher" && platform.teacherView === "live-control")) && (
        <button
          type="button"
          aria-label={`Rejoindre le live actif : ${platform.activeLiveCourse.title}`}
          onClick={() => {
            platform.setSelectedCourse(platform.activeLiveCourse);
            platform.setLiveCourseId(platform.activeLiveCourse!.id);
            if (platform.role === "student") {
              platform.setCurrentView("live");
            } else {
              platform.setTeacherView("live-control");
            }
            platform.setIsMobileMenuOpen(false);
          }}
          className="fixed right-4 bottom-4 sm:right-5 sm:bottom-5 z-50 bg-slate-950 border border-indigo-500/50 text-white rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-[min(280px,calc(100vw-2rem))] text-left cursor-pointer hover:bg-slate-900 transition-colors touch-target kbd-nav-focus"
        >
          <span className="relative flex h-3 w-3 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-widest text-indigo-300">Live actif</span>
            <span className="block text-xs font-bold truncate">{platform.activeLiveCourse.title}</span>
          </span>
        </button>
      )}

      <KeyboardShortcutsHelp open={platform.showKeyboardHelp} onClose={() => platform.setShowKeyboardHelp(false)} />
    </div>
  );
}
