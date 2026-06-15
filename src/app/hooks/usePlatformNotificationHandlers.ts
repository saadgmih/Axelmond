import { useCallback } from "react";
import type { AppNotification } from "../../types/messaging";
import type { Course } from "../../types";

export function usePlatformNotificationHandlers(options: {
  role: string;
  courses: Course[];
  enrolledCourses: number[];
  navigateTo: (view: string, course?: Course) => void;
  handleTeacherViewChange: (view: string) => void;
}) {
  const { role, courses, enrolledCourses, navigateTo, handleTeacherViewChange } = options;

  const openNotificationsView = useCallback(() => {
    if (role === "teacher") handleTeacherViewChange("notifications");
    else navigateTo("notifications");
  }, [role, handleTeacherViewChange, navigateTo]);

  const handleNotificationNavigate = useCallback(
    (notification: AppNotification) => {
      const { actionUrl, metadata } = notification;

      if (actionUrl.includes("messages")) {
        const conversationId =
          typeof metadata.conversationId === "string"
            ? metadata.conversationId
            : new URL(actionUrl, window.location.origin).searchParams.get("conversation");
        const messagesPath = role === "teacher" ? "/teacher/messages" : "/student/messages";
        if (conversationId) {
          window.history.replaceState(null, "", `${messagesPath}?conversation=${encodeURIComponent(conversationId)}`);
        }
        if (role === "teacher") handleTeacherViewChange("messages");
        else navigateTo("messages");
        return;
      }

      if (actionUrl.includes("live")) {
        const courseId = Number(metadata.courseId);
        const liveCourse =
          (Number.isFinite(courseId)
            ? courses.find((course) => course.id === courseId && enrolledCourses.includes(course.id))
            : null) ??
          courses.find((course) => enrolledCourses.includes(course.id) && course.isLiveNow) ??
          null;
        if (liveCourse) navigateTo("live", liveCourse);
        return;
      }

      if (actionUrl.includes("course")) {
        const courseId = Number(metadata.courseId);
        const targetCourse =
          (Number.isFinite(courseId)
            ? courses.find((course) => course.id === courseId && enrolledCourses.includes(course.id))
            : null) ??
          courses.find((course) => enrolledCourses.includes(course.id)) ??
          null;
        if (targetCourse) navigateTo("course", targetCourse);
        else navigateTo("catalog");
      }
    },
    [role, courses, enrolledCourses, handleTeacherViewChange, navigateTo],
  );

  return { openNotificationsView, handleNotificationNavigate };
}
