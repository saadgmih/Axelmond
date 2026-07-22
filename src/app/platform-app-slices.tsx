import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PlatformAppState } from "./platform-app-types";

export type PlatformSessionSlice = Pick<
  PlatformAppState["session"],
  | "isLoading"
  | "isAuthReady"
  | "catalogError"
  | "catalogHasData"
  | "retryCatalogLoad"
  | "currentUser"
  | "role"
  | "enrolledCourses"
  | "invoices"
  | "handleLoginSuccess"
  | "handleLogout"
  | "updateSessionUser"
  | "setEnrolledCourses"
  | "setInvoices"
  | "notificationUnreadCount"
  | "isLoginDataLoading"
  | "isEnrolledCatalogSyncing"
  | "isInitialViewLoading"
>;

export type PlatformCatalogSlice = Pick<
  PlatformAppState["catalog"],
  | "isLoading"
  | "courses"
  | "setCourses"
  | "domains"
  | "catalogCourses"
  | "isDisciplineCoursesLoading"
  | "disciplineLoadError"
  | "retryDisciplineLoad"
  | "selectedDomain"
  | "selectedDiscipline"
  | "setSelectedDomainId"
  | "setSelectedDisciplineId"
  | "searchQuery"
  | "setSearchQuery"
  | "catalogSearchRef"
  | "getInitials"
>;

export type PlatformNavigationSlice = Pick<
  PlatformAppState["navigation"],
  | "currentView"
  | "teacherView"
  | "selectedCourse"
  | "setSelectedCourse"
  | "selectedModule"
  | "setSelectedModule"
  | "setSelectedLessonContent"
  | "navigateTo"
  | "handleTeacherViewChange"
  | "setTeacherView"
  | "setCurrentView"
>;

export type PlatformLiveSlice = Pick<
  PlatformAppState["live"],
  | "activeLiveCourse"
  | "setActiveLiveCourse"
  | "liveCourseId"
  | "setLiveCourseId"
  | "toggleTeacherLiveSession"
  | "renderLiveRoomInterface"
  | "classroomBindings"
  | "needsLiveKitSession"
  | "isStudentLive"
  | "isTeacherLiveRoom"
  | "isLiveSessionView"
  | "handleToggleCourseLive"
  | "handleUpdateCourseLiveSubject"
  | "handleStudentLiveEnded"
  | "roomRef"
>;

export type PlatformBindingsSlice = Pick<
  PlatformAppState["bindings"],
  | "curriculumBindings"
  | "quizCourseId"
  | "teacherDashboardBindings"
  | "studentCourseBindings"
  | "academicProfileBindings"
  | "handlePaymentSuccess"
>;

export type PlatformUiSlice = Pick<
  PlatformAppState["ui"],
  | "isMobileMenuOpen"
  | "setIsMobileMenuOpen"
  | "isSidebarCollapsed"
  | "setIsSidebarCollapsed"
  | "toggleSidebarCollapsed"
  | "courseToPurchase"
  | "setCourseToPurchase"
  | "showKeyboardHelp"
  | "setShowKeyboardHelp"
  | "lockMainScroll"
  | "hideGlobalFooter"
  | "avatarStatusMsg"
  | "handleUploadAvatarFile"
  | "handleDeleteAvatar"
>;

function createSliceContext<T>(name: string) {
  const Context = createContext<T | null>(null);
  const useSlice = () => {
    const value = useContext(Context);
    if (!value) {
      throw new Error(`${name} must be used within PlatformAppSlicesProvider`);
    }
    return value;
  };
  return { Context, useSlice };
}

const sessionCtx = createSliceContext<PlatformSessionSlice>("usePlatformSession");
const catalogCtx = createSliceContext<PlatformCatalogSlice>("usePlatformCatalog");
const navigationCtx = createSliceContext<PlatformNavigationSlice>("usePlatformNavigation");
const liveCtx = createSliceContext<PlatformLiveSlice>("usePlatformLive");
const bindingsCtx = createSliceContext<PlatformBindingsSlice>("usePlatformBindings");
const uiCtx = createSliceContext<PlatformUiSlice>("usePlatformUi");

export const usePlatformSession = sessionCtx.useSlice;
export const usePlatformCatalog = catalogCtx.useSlice;
export const usePlatformNavigation = navigationCtx.useSlice;
export const usePlatformLive = liveCtx.useSlice;
export const usePlatformBindings = bindingsCtx.useSlice;
export const usePlatformUi = uiCtx.useSlice;

export function PlatformAppSlicesProvider({
  session,
  catalog,
  navigation,
  live,
  bindings,
  ui,
  children,
}: {
  session: PlatformSessionSlice;
  catalog: PlatformCatalogSlice;
  navigation: PlatformNavigationSlice;
  live: PlatformLiveSlice;
  bindings: PlatformBindingsSlice;
  ui: PlatformUiSlice;
  children: ReactNode;
}) {
  const sessionValue = useMemo(() => session, [session]);
  const catalogValue = useMemo(() => catalog, [catalog]);
  const navigationValue = useMemo(() => navigation, [navigation]);
  const liveValue = useMemo(() => live, [live]);
  const bindingsValue = useMemo(() => bindings, [bindings]);
  const uiValue = useMemo(() => ui, [ui]);

  return (
    <sessionCtx.Context.Provider value={sessionValue}>
      <catalogCtx.Context.Provider value={catalogValue}>
        <navigationCtx.Context.Provider value={navigationValue}>
          <liveCtx.Context.Provider value={liveValue}>
            <bindingsCtx.Context.Provider value={bindingsValue}>
              <uiCtx.Context.Provider value={uiValue}>{children}</uiCtx.Context.Provider>
            </bindingsCtx.Context.Provider>
          </liveCtx.Context.Provider>
        </navigationCtx.Context.Provider>
      </catalogCtx.Context.Provider>
    </sessionCtx.Context.Provider>
  );
}
