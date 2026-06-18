export const COURSE_ENROLLMENT_ACCESS_DAYS = 30;
export const COURSE_ENROLLMENT_ACCESS_MS = COURSE_ENROLLMENT_ACCESS_DAYS * 24 * 60 * 60 * 1000;

export type EnrollmentAccessRecord = {
  active: boolean;
  endDate?: Date | string | null;
  startDate?: Date | string | null;
  courseId?: number;
};

function toTimestamp(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

/** Active enrollment: flag set and no expiry date or expiry still in the future. */
export function isEnrollmentActive(enrollment: EnrollmentAccessRecord, now = new Date()): boolean {
  if (!enrollment.active) return false;

  const endTime = toTimestamp(enrollment.endDate ?? null);
  if (endTime == null) return true;

  return endTime > now.getTime();
}

export function getActiveEnrolledCourseIds(
  enrollments: Array<EnrollmentAccessRecord & { courseId: number }>,
  now = new Date(),
): number[] {
  return [
    ...new Set(
      enrollments
        .filter((enrollment) => isEnrollmentActive(enrollment, now))
        .map((enrollment) => enrollment.courseId)
        .filter((courseId) => Number.isInteger(courseId) && courseId > 0),
    ),
  ];
}

export function buildEnrollmentEndDate(from = new Date()): Date {
  return new Date(from.getTime() + COURSE_ENROLLMENT_ACCESS_MS);
}
