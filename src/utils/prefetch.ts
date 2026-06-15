import { api } from "../api";

const inflight = new Map<string, Promise<unknown>>();
const resolved = new Set<string>();

export function prefetchOnce<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (resolved.has(key)) {
    return Promise.resolve(undefined as T);
  }
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = loader()
    .then((value) => {
      resolved.add(key);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

export function prefetchCourseContent(courseId: number) {
  if (!Number.isFinite(courseId) || courseId <= 0) return;
  void prefetchOnce(`course-content:${courseId}`, () => api.getCourseContent(courseId));
}

export function prefetchCourseDetail(courseId: number) {
  if (!Number.isFinite(courseId) || courseId <= 0) return;
  void prefetchOnce(`course:${courseId}`, () => api.getCourse(courseId));
}

export function prefetchStudentCourseViewChunk() {
  void prefetchOnce("chunk:student-course-view", () => import("../views/student/StudentCourseView"));
}

export function prefetchCatalogDiscipline(disciplineId: number) {
  if (!Number.isFinite(disciplineId) || disciplineId <= 0) return;
  void prefetchOnce(`courses:discipline:${disciplineId}`, () => api.getCourses({ disciplineId }));
  void prefetchStudentCourseViewChunk();
}

const STUDENT_VIEW_CHUNKS: Record<string, () => Promise<unknown>> = {
  dashboard: () => import("../views/student/StudentDashboardView"),
  catalog: () => import("../views/student/StudentCatalogView"),
  profile: () => import("../views/student/StudentProfileView"),
  "study-plan": () => import("../views/student/StudentStudyPlanView"),
  "study-schedule": () => import("../views/student/StudentStudyScheduleView"),
  objectives: () => import("../views/student/StudentObjectivesView"),
  messages: () => import("../views/shared/MessagesView"),
  notifications: () => import("../views/shared/NotificationsView"),
  course: () => import("../views/student/StudentCourseView"),
  live: () => import("../views/student/StudentLiveView"),
};

const TEACHER_VIEW_CHUNKS: Record<string, () => Promise<unknown>> = {
  dashboard: () => import("../views/teacher/TeacherDashboardView"),
  "academic-profile": () => import("../views/teacher/TeacherAcademicProfileView"),
  schedule: () => import("../views/teacher/TeacherScheduleView"),
  curriculum: () => import("../views/teacher/TeacherCurriculumView"),
  "live-control": () => import("../views/teacher/TeacherLiveControlView"),
  messages: () => import("../views/shared/MessagesView"),
  notifications: () => import("../views/shared/NotificationsView"),
};

export function prefetchStudentView(view: string) {
  const loader = STUDENT_VIEW_CHUNKS[view];
  if (loader) void prefetchOnce(`chunk:student:${view}`, loader);
}

export function prefetchTeacherView(view: string) {
  const loader = TEACHER_VIEW_CHUNKS[view];
  if (loader) void prefetchOnce(`chunk:teacher:${view}`, loader);
}
