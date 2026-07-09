import type { Prisma } from "@prisma/client";
import type { UserRole } from "./rbac";

export function buildCatalogCourseVisibilityWhere(options: {
  role?: UserRole | null;
  userId?: string | null;
  fullName?: string | null;
  studentEnrolledIds?: number[];
}): Prisma.CourseWhereInput {
  const { role, userId, fullName, studentEnrolledIds = [] } = options;

  if (role === "ADMIN") {
    return {};
  }

  if (role === "PROFESSOR" || role === "RESEARCHER") {
    return {
      OR: [{ createdById: userId || undefined }, { createdById: null, instructor: fullName || undefined }],
    };
  }

  if (role === "STUDENT") {
    if (studentEnrolledIds.length > 0) {
      return { OR: [{ published: true }, { id: { in: studentEnrolledIds } }] };
    }
    return { published: true };
  }

  return { published: true };
}
