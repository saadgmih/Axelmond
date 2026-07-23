import { decodeStoredText } from "../../text";
import type { UserProfileSummary } from "../../types";

export function toCourseInstructorProfile(course: any): UserProfileSummary | null {
  if (course.createdBy) {
    return {
      id: course.createdBy.id,
      fullName: decodeStoredText(course.createdBy.fullName),
      role: course.createdBy.role,
      avatarUrl: course.createdBy.avatarUrl || null,
      title: course.createdBy.levelOrTitle || null,
    };
  }

  if (!course.createdById) return null;
  return {
    id: course.createdById,
    fullName: decodeStoredText(course.instructor),
    role: "PROFESSOR",
    avatarUrl: null,
    title: null,
  };
}
