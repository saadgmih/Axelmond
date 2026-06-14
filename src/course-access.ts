import type { UserRole } from "./rbac";
import { PUBLIC_API_ERRORS } from "./public-api-errors";

export interface CourseLearningAccessUser {
  id: string;
  role: UserRole;
  enrolledCourses: number[];
}

export interface CourseLearningAccessRecord {
  id: number;
  title: string;
  createdById?: string | null;
  modules?: unknown;
}

export type CourseLearningAccessResult =
  | { ok: true; course: CourseLearningAccessRecord }
  | { ok: false; status: 403 | 404; error: string };

export const COURSE_LEARNING_ACCESS_ERRORS = {
  notFound: PUBLIC_API_ERRORS.courseNotFound,
  enrollmentRequired: PUBLIC_API_ERRORS.enrollmentRequiredContent,
  accessDenied: PUBLIC_API_ERRORS.accessDeniedCourse,
} as const;

export function canAccessCourseLearning(
  authUser: CourseLearningAccessUser,
  course: CourseLearningAccessRecord,
): boolean {
  if (authUser.role === "ADMIN") return true;
  if (authUser.role === "STUDENT") return authUser.enrolledCourses.includes(course.id);
  return course.createdById === authUser.id;
}

export function evaluateCourseLearningAccess(
  authUser: CourseLearningAccessUser,
  course: CourseLearningAccessRecord | null | undefined,
): CourseLearningAccessResult {
  if (!course) {
    return { ok: false, status: 404, error: COURSE_LEARNING_ACCESS_ERRORS.notFound };
  }

  if (!canAccessCourseLearning(authUser, course)) {
    const error =
      authUser.role === "STUDENT"
        ? COURSE_LEARNING_ACCESS_ERRORS.enrollmentRequired
        : COURSE_LEARNING_ACCESS_ERRORS.accessDenied;
    return { ok: false, status: 403, error };
  }

  return { ok: true, course };
}

export type FindCourseById = (courseId: number) => Promise<CourseLearningAccessRecord | null>;

export async function assertCourseLearningAccess(
  authUser: CourseLearningAccessUser,
  courseId: number,
  findCourseById: FindCourseById,
): Promise<CourseLearningAccessResult> {
  const course = await findCourseById(courseId);
  return evaluateCourseLearningAccess(authUser, course);
}
