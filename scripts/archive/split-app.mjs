import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appPath = path.join(root, "src/App.tsx");
const app = fs.readFileSync(appPath, "utf8");
const lines = app.split(/\r?\n/);

const hookStart = lines.findIndex((l) => l.includes("const [courses, setCourses]"));
const hookEnd = lines.findIndex((l) => l.trim().startsWith("if (isLoading || !isAuthReady)"));

const hookImports = `import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api, getFreshSessionToken } from "../api";
import type { AppUser } from "../components/AuthScreen";
import { uploadFiles, getUploadedFileUrl, getUploadErrorMessage, validateUploadFile } from "../uploadthing-client";
import { useLiveKitSession } from "../context/livekit-session-context";
import { useNotifications } from "../hooks/useNotifications";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useMessagingSocket } from "../hooks/useMessagingSocket";
import { scrollAppToTopDeferred } from "../utils/scroll-app-to-top";
import { useCourseContent } from "../hooks/useCourseContent";
import { useTeacherCurriculum } from "../hooks/useTeacherCurriculum";
import { useAppSession } from "../hooks/useAppSession";
import { usePlatformNavigation } from "../hooks/usePlatformNavigation";
import { useAcademicProfile } from "../hooks/useAcademicProfile";
import { useTeacherDashboard } from "../hooks/useTeacherDashboard";
import { useStudentCourseSession } from "../hooks/useStudentCourseSession";
import { isStudentRole } from "../rbac";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import type { AppNotification } from "../types/messaging";
import type { Course, CourseModule, FacultyDomain } from "../types";
import { getInitials } from "./catalogIcons";

export function usePlatformApp() {
`;

let hookBody = lines.slice(hookStart, hookEnd).join("\n");
hookBody = hookBody.replace(/\n  \/\/ Helper code mapped to icon component[\s\S]*?const getInitials = \(name: string\) => \{[\s\S]*?\n  \};\n/, "\n");

const hookReturn = `
  return {
    courses, setCourses, domains, isLoading, isAuthReady, currentUser, role, enrolledCourses, invoices,
    handleLoginSuccess, currentView, teacherView, selectedCourse, setSelectedCourse, selectedModule, setSelectedModule,
    setSelectedLessonContent, activeLiveCourse, setActiveLiveCourse, liveCourseId, setLiveCourseId,
    isMobileMenuOpen, setIsMobileMenuOpen, searchQuery, setSearchQuery, courseToPurchase, setCourseToPurchase,
    showKeyboardHelp, setShowKeyboardHelp, catalogSearchRef, selectedDomain, selectedDiscipline,
    setSelectedDomainId, setSelectedDisciplineId, catalogCourses, curriculumBindings, quizCourseId,
    teacherDashboardBindings, handleToggleCourseLive, handleUpdateCourseLiveSubject, studentCourseBindings,
    handlePaymentSuccess, navigateTo, handleTeacherViewChange, notifications, notificationUnreadCount,
    notificationsLoading, notificationsError, loadNotifications, markNotificationRead, markAllNotificationsRead,
    openNotificationsView, handleNotificationNavigate, pushStatus, pushStatusKind, subscribePushNotifications,
    academicProfileBindings, avatarStatusMsg, handleUploadAvatarFile, handleDeleteAvatar,
    toggleTeacherLiveSession, renderLiveRoomInterface, classroomBindings, needsLiveKitSession,
    isStudentLive, isTeacherLiveRoom, isLiveSessionView, lockMainScroll, hideGlobalFooter, handleLogout,
    updateSessionUser, setEnrolledCourses, setInvoices, setTeacherView, setCurrentView, getInitials,
  };
}
`;

fs.writeFileSync(path.join(root, "src/app/usePlatformApp.ts"), hookImports + hookBody + hookReturn);

const jsxStart = lines.findIndex((l) => l.trim() === "return (");
const jsxEnd = lines.findIndex((l, i) => i > jsxStart && l.trim() === ");" && lines[i + 1]?.trim() === "}");

const jsxBlock = lines.slice(jsxStart + 1, jsxEnd).join("\n");

const layoutImports = `import React, { Suspense } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import SkipLink from "../components/SkipLink";
import KeyboardShortcutsHelp from "../components/KeyboardShortcutsHelp";
import { INSTITUTIONAL_VIEWS } from "../navigation/platformPaths";
import InstitutionalViewSwitch from "../views/InstitutionalViewSwitch";
import { LazyLiveKitSessionHost, LazyPaymentModal, RouteChunkFallback } from "../lazyViews";
import { usePlatformAppContext } from "./platform-app-context";
import { StudentRouteSwitch } from "./StudentRouteSwitch";
import { TeacherRouteSwitch } from "./TeacherRouteSwitch";
import { AppFooter } from "./AppFooter";

export function AuthenticatedPlatformLayout() {
  const platform = usePlatformAppContext();
  const {
    needsLiveKitSession, activeLiveCourse, setActiveLiveCourse, currentUser, courses, liveCourseId,
    setSelectedCourse, setTeacherView, setCurrentView, setCourseToPurchase, updateSessionUser,
    setEnrolledCourses, setInvoices, getInitials, navigateTo, teacherView, handleToggleCourseLive,
    isMobileMenuOpen, setIsMobileMenuOpen, currentView, role, enrolledCourses, handleTeacherViewChange,
    onLogout: handleLogout, notificationUnreadCount, isStudentLive, searchQuery, setSearchQuery,
    catalogSearchRef, lockMainScroll, hideGlobalFooter, courseToPurchase, setCourseToPurchase,
    handlePaymentSuccess, showKeyboardHelp, setShowKeyboardHelp,
  } = platform;

  return (
`;

const layoutFooter = `
  );
}
`;

fs.writeFileSync(
  path.join(root, "src/app/AuthenticatedPlatformLayout.tsx"),
  layoutImports + jsxBlock.replace(
    /INSTITUTIONAL_VIEWS\.has\(currentView\) \? \([\s\S]*?\) : role === "teacher" \? \([\s\S]*?\) : \([\s\S]*?\)\}/,
    `{INSTITUTIONAL_VIEWS.has(platform.currentView) ? (
            <InstitutionalViewSwitch currentView={platform.currentView} currentUser={platform.currentUser!} navigateTo={platform.navigateTo} />
          ) : platform.role === "teacher" ? (
            <TeacherRouteSwitch />
          ) : (
            <StudentRouteSwitch />
          )}`,
  ).replace(/onLogout=\{handleLogout\}/, "onLogout={platform.handleLogout}")
    + layoutFooter,
);

console.log("split-app.mjs: usePlatformApp + layout stub written");
