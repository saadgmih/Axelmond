import { lazy, type ReactNode } from "react";

export function RouteChunkFallback({ label }: { label: string }): ReactNode {
  return (
    <div className="flex min-h-[12rem] items-center justify-center p-8 text-center text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm font-semibold">{label}</p>
      </div>
    </div>
  );
}

export const LazyAuthScreen = lazy(() => import("./components/AuthScreen"));
export const LazyTeacherWorkspace = lazy(() => import("./views/teacher/TeacherWorkspace"));
export const LazyTeacherDashboardView = lazy(() => import("./views/teacher/TeacherDashboardView"));
export const LazyTeacherAcademicProfileView = lazy(() => import("./views/teacher/TeacherAcademicProfileView"));
export const LazyTeacherCurriculumView = lazy(() => import("./views/teacher/TeacherCurriculumView"));
export const LazyTeacherScheduleView = lazy(() => import("./views/teacher/TeacherScheduleView"));
export const LazyTeacherLiveControlView = lazy(() => import("./views/teacher/TeacherLiveControlView"));
export const LazyMessagesView = lazy(() => import("./views/shared/MessagesView"));
export const LazyStudentDashboardView = lazy(() => import("./views/student/StudentDashboardView"));
export const LazyStudentCatalogView = lazy(() => import("./views/student/StudentCatalogView"));
export const LazyStudentProfileView = lazy(() => import("./views/student/StudentProfileView"));
export const LazyStudentStudyScheduleView = lazy(() => import("./views/student/StudentStudyScheduleView"));
export const LazyStudentObjectivesView = lazy(() => import("./views/student/StudentObjectivesView"));
export const LazyNotificationsView = lazy(() => import("./views/shared/NotificationsView"));
export const LazyStudentCourseView = lazy(() => import("./views/student/StudentCourseView"));
export const LazyStudentLiveView = lazy(() => import("./views/student/StudentLiveView"));
export const LazyPaymentModal = lazy(() => import("./components/PaymentModal"));
export const LazyLiveKitSessionHost = lazy(() => import("./views/live/LiveKitSessionHost"));

export const LazyAboutView = lazy(() => import("./components/AboutView"));
export const LazyPrivacyView = lazy(() => import("./components/PrivacyView"));
export const LazyTermsView = lazy(() => import("./components/TermsView"));
export const LazyCookiesView = lazy(() => import("./components/CookiesView"));
export const LazyLegalView = lazy(() => import("./components/LegalView"));
export const LazyResearchView = lazy(() => import("./components/ResearchView"));
export const LazyPublicationsView = lazy(() => import("./components/PublicationsView"));
export const LazyContactView = lazy(() => import("./components/ContactView"));
export const LazySupportView = lazy(() => import("./components/SupportView"));
