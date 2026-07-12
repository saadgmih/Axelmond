export const COURSE_ENROLLMENT_ACCESS_DAYS = 30;
export const COURSE_ENROLLMENT_ACCESS_MS = COURSE_ENROLLMENT_ACCESS_DAYS * 24 * 60 * 60 * 1000;

export type EnrollmentAccessRecord = {
  active: boolean;
  hasAiAccess?: boolean;
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

export function getEnrollmentEffectiveEndDate(enrollment: EnrollmentAccessRecord): Date | null {
  const explicitEndTime = toTimestamp(enrollment.endDate ?? null);
  if (explicitEndTime != null) return new Date(explicitEndTime);

  const startTime = toTimestamp(enrollment.startDate ?? null);
  if (startTime == null) return null;

  return buildEnrollmentEndDate(new Date(startTime));
}

/** Active enrollment: flag set and effective expiry date still in the future. */
export function isEnrollmentActive(enrollment: EnrollmentAccessRecord, now = new Date()): boolean {
  if (!enrollment.active) return false;

  const endTime = getEnrollmentEffectiveEndDate(enrollment)?.getTime();
  if (endTime == null) return false;

  return endTime > now.getTime();
}

export function isEnrollmentExpired(enrollment: EnrollmentAccessRecord, now = new Date()): boolean {
  return !isEnrollmentActive(enrollment, now);
}

export function getEnrollmentRemainingMs(enrollment: EnrollmentAccessRecord, now = new Date()): number | null {
  if (!isEnrollmentActive(enrollment, now)) return 0;

  const endTime = getEnrollmentEffectiveEndDate(enrollment)?.getTime();
  if (endTime == null) return 0;

  return Math.max(0, endTime - now.getTime());
}

export function isEnrollmentEndingSoon(
  enrollment: EnrollmentAccessRecord,
  thresholdMs = 3 * 24 * 60 * 60 * 1000,
  now = new Date(),
): boolean {
  const remainingMs = getEnrollmentRemainingMs(enrollment, now);
  return remainingMs != null && remainingMs > 0 && remainingMs <= thresholdMs;
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

export function getActiveAiTutorCourseIds(
  enrollments: Array<EnrollmentAccessRecord & { courseId: number }>,
  now = new Date(),
): number[] {
  return [
    ...new Set(
      enrollments
        .filter((enrollment) => enrollment.hasAiAccess && isEnrollmentActive(enrollment, now))
        .map((enrollment) => enrollment.courseId)
        .filter((courseId) => Number.isInteger(courseId) && courseId > 0),
    ),
  ];
}

export function buildEnrollmentEndDate(from = new Date(), accessDays = COURSE_ENROLLMENT_ACCESS_DAYS): Date {
  return new Date(from.getTime() + accessDays * 24 * 60 * 60 * 1000);
}
