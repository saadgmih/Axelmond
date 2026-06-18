import { Suspense } from "react";
import {
  LazyMessagesView,
  LazyStudentCatalogView,
  LazyStudentCourseView,
  LazyStudentDashboardView,
  LazyStudentProfileView,
  LazyStudentAccountSecurityView,
  LazyStudentStudyPlanView,
  RouteChunkFallback,
} from "../lazyViews";
import { getCourseIcon, getDomainIcon } from "./catalogIcons";
import { NotificationsRoutePanel } from "./NotificationsRoutePanel";
import {
  usePlatformBindings,
  usePlatformCatalog,
  usePlatformLive,
  usePlatformNavigation,
  usePlatformSession,
  usePlatformUi,
} from "./platform-app-slices";

export function StudentRouteSwitch() {
  const session = usePlatformSession();
  const catalog = usePlatformCatalog();
  const navigation = usePlatformNavigation();
  const live = usePlatformLive();
  const bindings = usePlatformBindings();
  const ui = usePlatformUi();

  const { currentUser, enrolledCourses, role, invoices, isLoginDataLoading, isEnrolledCatalogSyncing } = session;
  const { currentView, navigateTo, selectedCourse, selectedModule, setSelectedModule } = navigation;
  const {
    domains,
    selectedDomain,
    selectedDiscipline,
    catalogCourses,
    courses,
    setSelectedDomainId,
    setSelectedDisciplineId,
    setSearchQuery,
  } = catalog;
  const { studentCourseBindings } = bindings;
  const { activeLiveCourse } = live;
  const { avatarStatusMsg, handleUploadAvatarFile, handleDeleteAvatar } = ui;

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
            isLoginDataLoading={isLoginDataLoading}
            isEnrolledCatalogSyncing={isEnrolledCatalogSyncing}
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
            setCourseToPurchase={ui.setCourseToPurchase}
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
          <p className="text-sm font-semibold">Ce module n'a pas encore de contenu publié.</p>
          <p className="mt-2 text-xs text-slate-500">
            Le professeur doit publier au moins un chapitre ou un média pédagogique pour commencer.
          </p>
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
              }}
              setCourseToPurchase={ui.setCourseToPurchase}
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
            invoices={invoices}
            avatarStatusMsg={avatarStatusMsg}
            handleUploadAvatarFile={handleUploadAvatarFile}
            handleDeleteAvatar={handleDeleteAvatar}
          />
        </Suspense>
      )}
      {currentView === "account-security" && (
        <Suspense fallback={<RouteChunkFallback label="Chargement de la sécurité du compte…" />}>
          <LazyStudentAccountSecurityView currentUser={currentUser} />
        </Suspense>
      )}
      {(currentView === "study-plan" || currentView === "study-schedule" || currentView === "objectives") && (
        <Suspense fallback={<RouteChunkFallback label="Chargement du plan d'étude…" />}>
          <LazyStudentStudyPlanView role={role} currentView={currentView} />
        </Suspense>
      )}
      {currentView === "messages" && (
        <Suspense fallback={<RouteChunkFallback label="Chargement de la messagerie…" />}>
          <div className="p-4 md:p-8">
            <LazyMessagesView currentUserId={currentUser.id} role="student" />
          </div>
        </Suspense>
      )}
      {currentView === "notifications" && <NotificationsRoutePanel />}
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
            <div id="live-room-portal-target" className="flex h-full w-full min-h-0 flex-col overflow-hidden"></div>
          </div>
        </Suspense>
      )}
    </>
  );
}
