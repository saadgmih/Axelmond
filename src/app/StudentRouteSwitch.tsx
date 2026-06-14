import { Suspense } from "react";
import {
  LazyMessagesView,
  LazyNotificationsView,
  LazyStudentCatalogView,
  LazyStudentCourseView,
  LazyStudentDashboardView,
  LazyStudentLiveView,
  LazyStudentObjectivesView,
  LazyStudentProfileView,
  LazyStudentStudyScheduleView,
  RouteChunkFallback,
} from "../lazyViews";
import { getCourseIcon, getDomainIcon } from "./catalogIcons";
import { usePlatformAppContext } from "./platform-app-context";

export function StudentRouteSwitch() {
  const platform = usePlatformAppContext();
  const {
    currentView,
    currentUser,
    navigateTo,
    enrolledCourses,
    courses,
    domains,
    selectedDomain,
    selectedDiscipline,
    catalogCourses,
    setCourseToPurchase,
    setSelectedDomainId,
    setSelectedDisciplineId,
    setSearchQuery,
    selectedCourse,
    selectedModule,
    setSelectedModule,
    setSelectedLessonContent,
    avatarStatusMsg,
    handleUploadAvatarFile,
    handleDeleteAvatar,
    role,
    notifications,
    notificationsLoading,
    notificationsError,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    handleNotificationNavigate,
    pushStatus,
    pushStatusKind,
    subscribePushNotifications,
    activeLiveCourse,
    classroomBindings,
    studentCourseBindings,
  } = platform;

  if (!currentUser) return null;

  return (
    <>
      {currentView === "dashboard" && (
        <Suspense fallback={<RouteChunkFallback label="Chargement du tableau de bord…" />}>
          <LazyStudentDashboardView
            currentUser={currentUser}
            navigateTo={navigateTo}
            enrolledCourses={enrolledCourses}
            courses={courses}
            getCourseIcon={getCourseIcon}
          />
        </Suspense>
      )}
      {currentView === "catalog" && (
        <Suspense fallback={<RouteChunkFallback label="Chargement du catalogue…" />}>
          <LazyStudentCatalogView
            domains={domains}
            selectedDomain={selectedDomain}
            selectedDiscipline={selectedDiscipline}
            catalogCourses={catalogCourses}
            enrolledCourses={enrolledCourses}
            getCourseIcon={getCourseIcon}
            getDomainIcon={getDomainIcon}
            navigateTo={navigateTo}
            setCourseToPurchase={setCourseToPurchase}
            setSelectedDomainId={setSelectedDomainId}
            setSelectedDisciplineId={setSelectedDisciplineId}
            setSearchQuery={setSearchQuery}
          />
        </Suspense>
      )}
      {currentView === "course" && !selectedCourse && (
        <div className="mx-auto max-w-xl p-8 text-center text-slate-300">
          <p className="text-sm font-semibold">Aucun cours sélectionné.</p>
          <button
            type="button"
            onClick={() => navigateTo("dashboard")}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
          >
            Retour au tableau de bord
          </button>
        </div>
      )}
      {currentView === "course" && selectedCourse && !selectedModule && (
        <div className="mx-auto max-w-xl p-8 text-center text-slate-300">
          <p className="text-sm font-semibold">Ce cours ne contient pas encore de module.</p>
          <button
            type="button"
            onClick={() => navigateTo("dashboard")}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
          >
            Retour au tableau de bord
          </button>
        </div>
      )}
      {currentView === "course" && selectedCourse && selectedModule && (
        <Suspense fallback={<RouteChunkFallback label="Chargement du module…" />}>
          <div className="h-full min-h-0">
            <LazyStudentCourseView
              selectedCourse={selectedCourse}
              selectedModule={selectedModule}
              navigateTo={navigateTo}
              onModuleSelect={(mod) => {
                setSelectedModule(mod);
                setSelectedLessonContent(null);
              }}
              {...studentCourseBindings}
            />
          </div>
        </Suspense>
      )}
      {currentView === "profile" && (
        <Suspense fallback={<RouteChunkFallback label="Chargement du profil…" />}>
          <LazyStudentProfileView
            currentUser={currentUser}
            enrolledCourses={enrolledCourses}
            courses={courses}
            invoices={platform.invoices}
            avatarStatusMsg={avatarStatusMsg}
            handleUploadAvatarFile={handleUploadAvatarFile}
            handleDeleteAvatar={handleDeleteAvatar}
          />
        </Suspense>
      )}
      {currentView === "study-schedule" && (
        <Suspense fallback={<RouteChunkFallback label="Chargement du planning…" />}>
          <LazyStudentStudyScheduleView role={role} currentView={currentView} />
        </Suspense>
      )}
      {currentView === "objectives" && (
        <Suspense fallback={<RouteChunkFallback label="Chargement des objectifs…" />}>
          <LazyStudentObjectivesView role={role} currentView={currentView} />
        </Suspense>
      )}
      {currentView === "messages" && (
        <Suspense fallback={<RouteChunkFallback label="Chargement de la messagerie…" />}>
          <div className="p-4 md:p-8">
            <LazyMessagesView currentUserId={currentUser.id} role="student" />
          </div>
        </Suspense>
      )}
      {currentView === "notifications" && (
        <Suspense fallback={<RouteChunkFallback label="Chargement des notifications…" />}>
          <div className="p-4 md:p-8">
            <LazyNotificationsView
              notifications={notifications}
              loading={notificationsLoading}
              error={notificationsError}
              onReload={loadNotifications}
              onMarkRead={markNotificationRead}
              onMarkAllRead={markAllNotificationsRead}
              onNavigate={handleNotificationNavigate}
              pushStatus={pushStatus}
              pushStatusKind={pushStatusKind}
              onEnablePush={subscribePushNotifications}
            />
          </div>
        </Suspense>
      )}
      {currentView === "live" && !activeLiveCourse && (
        <div className="mx-auto max-w-xl p-8 text-center text-slate-300">
          <p className="text-sm font-semibold">Aucune session live disponible pour le moment.</p>
          <button
            type="button"
            onClick={() => navigateTo("dashboard")}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
          >
            Retour au tableau de bord
          </button>
        </div>
      )}
      {currentView === "live" && activeLiveCourse && (
        <Suspense fallback={<RouteChunkFallback label="Chargement de la classe live…" />}>
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <LazyStudentLiveView
              course={activeLiveCourse}
              currentUserRole={currentUser?.role || "STUDENT"}
              onBack={() => navigateTo("course", activeLiveCourse)}
              {...classroomBindings}
            />
          </div>
        </Suspense>
      )}
    </>
  );
}
