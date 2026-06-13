import { Suspense } from "react";
import NotificationsView from "../views/shared/NotificationsView";
import {
  LazyMessagesView,
  LazyTeacherAcademicProfileView,
  LazyTeacherCurriculumView,
  LazyTeacherDashboardView,
  LazyTeacherLiveControlView,
  LazyTeacherScheduleView,
  LazyTeacherWorkspace,
  RouteChunkFallback,
} from "../lazyViews";
import { usePlatformAppContext } from "./platform-app-context";

export function TeacherRouteSwitch() {
  const platform = usePlatformAppContext();
  const {
    teacherView,
    currentUser,
    getInitials,
    handleTeacherViewChange,
    teacherDashboardBindings,
    academicProfileBindings,
    handleUploadAvatarFile,
    handleDeleteAvatar,
    avatarStatusMsg,
    domains,
    curriculumBindings,
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
    courses,
    liveCourseId,
    setLiveCourseId,
    setCourses,
    handleUpdateCourseLiveSubject,
    handleToggleCourseLive,
    toggleTeacherLiveSession,
    activeLiveCourse,
    renderLiveRoomInterface,
    isTeacherLiveRoom,
  } = platform;

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
        {teacherView === "curriculum" && (
          <Suspense fallback={<RouteChunkFallback label="Chargement du curriculum…" />}>
            <LazyTeacherCurriculumView domains={domains} {...curriculumBindings} />
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
        {teacherView === "notifications" && (
          <div className="p-4 md:p-8">
            <NotificationsView
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
        )}
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
              renderTeacherLiveRoom={() => renderLiveRoomInterface("teacher")}
            />
          </Suspense>
        )}
      </LazyTeacherWorkspace>
    </Suspense>
  );
}
