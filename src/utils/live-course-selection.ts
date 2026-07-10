export function resolveLiveCourseId(courses: readonly { id: number }[], liveCourseId: number): number {
  if (courses.length === 0) return liveCourseId;
  if (courses.some((course) => course.id === liveCourseId)) return liveCourseId;
  return courses[0].id;
}

export function findLiveCourse<T extends { id: number }>(courses: readonly T[], liveCourseId: number): T | null {
  const resolvedId = resolveLiveCourseId(courses, liveCourseId);
  return courses.find((course) => course.id === resolvedId) ?? null;
}
