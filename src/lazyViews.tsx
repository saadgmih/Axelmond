import { lazy, type ReactNode } from "react";

export function RouteChunkFallback({ label }: { label: string }): ReactNode {
  return (
    <div className="sr-only" role="status" aria-live="polite">
      {label}
    </div>
  );
}

export const LazyAuthScreen = lazy(() => import("./components/AuthScreen"));
export const LazyTeacherWorkspace = lazy(() => import("./views/teacher/TeacherWorkspace"));
export const LazyTeacherDashboardView = lazy(() => import("./views/teacher/TeacherDashboardView"));
export const LazyAdminProfessorAccessKeysView = lazy(() => import("./views/teacher/AdminProfessorAccessKeysView"));
export const LazyAdminCharityView = lazy(() => import("./views/teacher/AdminCharityView"));
export const LazyTeacherAcademicProfileView = lazy(() => import("./views/teacher/TeacherAcademicProfileView"));
export const LazyTeacherAccountSecurityView = lazy(() => import("./views/teacher/TeacherAccountSecurityView"));
export const LazyTeacherCurriculumView = lazy(() => import("./views/teacher/TeacherCurriculumView"));
export const LazyTeacherScheduleView = lazy(() => import("./views/teacher/TeacherScheduleView"));
export const LazyTeacherLiveControlView = lazy(() => import("./views/teacher/TeacherLiveControlView"));
export const LazyMessagesView = lazy(() => import("./views/shared/MessagesView"));
export const LazyStudentDashboardView = lazy(() => import("./views/student/StudentDashboardView"));
export const LazyStudentCatalogView = lazy(() => import("./views/student/StudentCatalogView"));
export const LazyStudentProfileView = lazy(() => import("./views/student/StudentProfileView"));
export const LazyStudentAccountSecurityView = lazy(() => import("./views/student/StudentAccountSecurityView"));
export const LazyStudentStudyPlanView = lazy(() => import("./views/student/StudentStudyPlanView"));
export const LazyStudentStudyScheduleView = lazy(() => import("./views/student/StudentStudyScheduleView"));
export const LazyStudentObjectivesView = lazy(() => import("./views/student/StudentObjectivesView"));
export const LazyNotificationsView = lazy(() => import("./views/shared/NotificationsView"));
export const LazyStudentCourseView = lazy(() => import("./views/student/StudentCourseView"));
export const LazyStudentCharityView = lazy(() => import("./views/student/CharityView"));
export const LazyStudentCenterPaymentsView = lazy(() => import("./views/student/StudentCenterPaymentsView"));
export const LazyAdminCenterPaymentsView = lazy(() => import("./views/teacher/AdminCenterPaymentsView"));
export const LazyAdminPromoCodesView = lazy(() => import("./views/teacher/AdminPromoCodesView"));
export const LazyStudentLiveView = lazy(() => import("./views/student/StudentLiveView"));
export const LazyPaymentModal = lazy(() => import("./components/PaymentModal"));
export const LazyLiveKitSessionHost = lazy(() => import("./views/live/LiveKitSessionHost"));

export const LazyAboutView = lazy(() => import("./components/AboutView"));
export const LazyPrivacyView = lazy(() => import("./components/PrivacyView"));
export const LazyTermsView = lazy(() => import("./components/TermsView"));
export const LazyCookiesView = lazy(() => import("./components/CookiesView"));
export const LazyLegalView = lazy(() => import("./components/LegalView"));
export const LazyContactView = lazy(() => import("./components/ContactView"));
export const LazySupportView = lazy(() => import("./components/SupportView"));
