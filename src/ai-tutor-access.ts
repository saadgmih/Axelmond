import type { CourseLearningAccessRecord, CourseLearningAccessResult } from "./course-access";
import { prisma } from "./db";
import { isEnrollmentActive } from "./enrollment-access";
import { PUBLIC_API_ERRORS } from "./public-api-errors";
import { isStudentRole } from "./rbac";

export const AI_TUTOR_ACCESS_ERRORS = {
  studentOnly: "L'assistant IA est réservé aux étudiants.",
  accessRequired:
    "Assistant IA non activé pour ce module. Ajoutez l'option lors de l'activation du module.",
} as const;

export type FindAiTutorCourseById = (courseId: number) => Promise<CourseLearningAccessRecord | null>;

export async function assertAiTutorAccess(
  authUser: { id: string; role: string },
  courseId: number,
  findCourseById: FindAiTutorCourseById,
): Promise<CourseLearningAccessResult> {
  if (!isStudentRole(authUser.role)) {
    return { ok: false, status: 403, error: AI_TUTOR_ACCESS_ERRORS.studentOnly };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: authUser.id, courseId } },
  });

  if (!enrollment || !isEnrollmentActive(enrollment) || !enrollment.hasAiAccess) {
    return { ok: false, status: 403, error: AI_TUTOR_ACCESS_ERRORS.accessRequired };
  }

  const course = await findCourseById(courseId);
  if (!course) {
    return { ok: false, status: 404, error: PUBLIC_API_ERRORS.courseNotFound };
  }

  return { ok: true, course };
}
