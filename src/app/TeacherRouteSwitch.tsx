import { Suspense } from "react";
import {
  LazyAdminProfessorAccessKeysView,
  LazyAdminCharityView,
  LazyStudentCharityView,
  LazyMessagesView,
  LazyTeacherAcademicProfileView,
  LazyTeacherAccountSecurityView,
  LazyTeacherCurriculumView,
  LazyTeacherDashboardView,
  LazyTeacherLiveControlView,
  LazyTeacherScheduleView,
  LazyTeacherWorkspace,
  LazyAdminCenterPaymentsView,
  LazyAdminPromoCodesView,
  RouteChunkFallback,
} from "../lazyViews";
import { CHARITY_LOADING_LABEL } from "../charity-labels";
import { NotificationsRoutePanel } from "./NotificationsRoutePanel";
import {
  usePlatformBindings,
  usePlatformCatalog,
  usePlatformLive,
  usePlatformNavigation,
  usePlatformSession,
  usePlatformUi,
} from "./platform-app-slices";

export function TeacherRouteSwitch() {
  const session = usePlatformSession();
  const catalog = usePlatformCatalog();
  const navigation = usePlatformNavigation();
  const live = usePlatformLive();
  const bindings = usePlatformBindings();
  const ui = usePlatformUi();

  const { currentUser, role } = session;
  const { teacherView, handleTeacherViewChange } = navigation;
  const { domains, courses, setCourses, getInitials } = catalog;
  const {
    liveCourseId,
    setLiveCourseId,
    handleUpdateCourseLiveSubject,
    handleToggleCourseLive,
    toggleTeacherLiveSession,
    activeLiveCourse,
    isTeacherLiveRoom,
  } = live;
  const { teacherDashboardBindings, academicProfileBindings, curriculumBindings } = bindings;
  const { courses: _dashboardCourses, ...teacherDashboardBindingsWithoutCourses } = teacherDashboardBindings;
  const { handleUploadAvatarFile, handleDeleteAvatar, avatarStatusMsg } = ui;

  if (!currentUser) return null;

  return (
    <Suspense fallback={<RouteChunkFallback label="Chargement de l'espace enseignant…" />}>
      <LazyTeacherWorkspace immersive={isTeacherLiveRoom}>
        {teacherView === "dashboard" && (
          <Suspense fallback={<RouteChunkFallback label="Chargement du tableau de bord…" />}>
            <LazyTeacherDashboardView
              currentUser={currentUser}
              getInitials={getInitials}
              onTeacherNavigate={handleTeacherViewChange}
              {...teacherDashboardBindings}
            />
          </Suspense>
        )}
        {teacherView === "access-keys" && currentUser.role === "ADMIN" && (
          <Suspense fallback={<RouteChunkFallback label="Chargement des codes professeur…" />}>
            <LazyAdminProfessorAccessKeysView {...teacherDashboardBindings} />
          </Suspense>
        )}
        {teacherView === "access-keys" && currentUser.role !== "ADMIN" && (
          <div className="rounded-lg border border-lime-200 bg-lime-50 p-5 text-sm font-semibold text-lime-900">
            Cet espace est réservé aux administrateurs.
          </div>
        )}
        {teacherView === "center-payments" && currentUser.role === "ADMIN" && (
          <Suspense fallback={<RouteChunkFallback label="Chargement des paiements au centre…" />}>
            <LazyAdminCenterPaymentsView />
          </Suspense>
        )}
        {teacherView === "center-payments" && currentUser.role !== "ADMIN" && (
          <div className="rounded-lg border border-red-300/30 bg-red-500/10 p-5 text-sm font-semibold text-red-100">
            Cet espace financier est réservé aux administrateurs autorisés.
          </div>
        )}
        {teacherView === "promo-codes" && currentUser.role === "ADMIN" && (
          <Suspense fallback={<RouteChunkFallback label="Chargement des codes promotionnels…" />}>
            <LazyAdminPromoCodesView />
          </Suspense>
        )}
        {teacherView === "promo-codes" && currentUser.role !== "ADMIN" && (
          <div className="rounded-lg border border-red-300/30 bg-red-500/10 p-5 text-sm font-semibold text-red-100">
            Cette gestion commerciale est réservée aux administrateurs autorisés.
          </div>
        )}
        {teacherView === "charity" && currentUser.role === "ADMIN" && (
          <Suspense fallback={<RouteChunkFallback label={CHARITY_LOADING_LABEL} />}>
            <LazyAdminCharityView enabled />
          </Suspense>
        )}
        {teacherView === "charity" && currentUser.role !== "ADMIN" && (
          <Suspense fallback={<RouteChunkFallback label={CHARITY_LOADING_LABEL} />}>
            <LazyStudentCharityView />
          </Suspense>
        )}
        {teacherView === "academic-profile" && (
          <Suspense fallback={<RouteChunkFallback label="Chargement du profil académique…" />}>
            <LazyTeacherAcademicProfileView
              currentUser={currentUser}
              handleUploadAvatarFile={handleUploadAvatarFile}
              handleDeleteAvatar={handleDeleteAvatar}
              avatarStatusMsg={avatarStatusMsg}
              {...academicProfileBindings}
            />
          </Suspense>
        )}
        {teacherView === "account-security" && (
          <Suspense fallback={<RouteChunkFallback label="Chargement de la sécurité du compte…" />}>
            <LazyTeacherAccountSecurityView currentUser={currentUser} />
          </Suspense>
        )}
        {teacherView === "curriculum" && (
          <Suspense fallback={<RouteChunkFallback label="Chargement du curriculum…" />}>
            <LazyTeacherCurriculumView
              domains={domains}
              courses={courses}
              canManageAcademicTaxonomy={currentUser.role === "ADMIN"}
              {...curriculumBindings}
              {...teacherDashboardBindingsWithoutCourses}
            />
          </Suspense>
        )}
        {teacherView === "schedule" && (
          <Suspense fallback={<RouteChunkFallback label="Chargement de l'emploi du temps…" />}>
            <LazyTeacherScheduleView role={role} teacherView={teacherView} />
          </Suspense>
        )}
        {teacherView === "messages" && (
          <Suspense fallback={<RouteChunkFallback label="Chargement de la messagerie…" />}>
            <div className="p-4 md:p-8">
              <LazyMessagesView currentUserId={currentUser.id} role="teacher" />
            </div>
          </Suspense>
        )}
        {teacherView === "notifications" && <NotificationsRoutePanel />}
        {teacherView === "live-control" && (
          <Suspense fallback={<RouteChunkFallback label="Chargement du studio live…" />}>
            <LazyTeacherLiveControlView
              courses={courses}
              liveCourseId={liveCourseId}
              setLiveCourseId={setLiveCourseId}
              setCourses={setCourses}
              handleUpdateCourseLiveSubject={handleUpdateCourseLiveSubject}
              handleToggleCourseLive={handleToggleCourseLive}
              toggleTeacherLiveSession={toggleTeacherLiveSession}
              activeLiveCourse={activeLiveCourse}
            />
          </Suspense>
        )}
      </LazyTeacherWorkspace>
    </Suspense>
  );
}
