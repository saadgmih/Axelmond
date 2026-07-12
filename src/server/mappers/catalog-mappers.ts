import { coerceCoursePrice } from "../../utils/course-pricing";
import { getSyllabusChapterProgress } from "../../utils/course-chapter-metrics";
import { Course, CourseEnrollmentInfo } from "../../types";
import { prisma } from "../../db";
import { decodeStoredText } from "../../text";
import { attachSyncedCourseModules } from "../../course-curriculum-sync";
import { isEnrollmentActive } from "../../enrollment-access";
import { resolveCourseModules } from "../../course-syllabus-modules";
import {
  getModuleContentProgressKey,
  getStudentProgressSnapshot,
  getStudentProgressSnapshotsByCourseIds,
  type StudentProgressSnapshot,
} from "../../student-content-progress";
import type { AppUser } from "../route-types";

export function toDomain(domain: any) {
  return {
    id: domain.id,
    name: domain.name,
    slug: domain.slug,
    iconName: domain.iconName,
    color: domain.color,
    description: domain.description,
    order: domain.order,
    courseCount: domain.courseCount,
    disciplines: Array.isArray(domain.disciplines) ? domain.disciplines.map(toDiscipline) : [],
  };
}

export function toDiscipline(discipline: any) {
  return {
    id: discipline.id,
    domainId: discipline.domainId,
    name: decodeStoredText(discipline.name),
    slug: discipline.slug,
    order: discipline.order,
    courseCount: discipline.courseCount,
    domain: discipline.domain
      ? {
          id: discipline.domain.id,
          name: decodeStoredText(discipline.domain.name),
          slug: discipline.domain.slug,
          iconName: discipline.domain.iconName,
          color: discipline.domain.color,
          description: decodeStoredText(discipline.domain.description),
          order: discipline.domain.order,
        }
      : undefined,
  };
}

export const activeLiveSessionSelect = {
  id: true,
  startTime: true,
  isActive: true,
  endTime: true,
} as const;

export const activeLiveSessionInclude = {
  where: { isActive: true, endTime: null },
  orderBy: { startTime: "asc" },
  take: 1,
  select: activeLiveSessionSelect,
} as const;

export const courseResponseInclude = {
  discipline: { include: { domain: true } },
  liveSessions: activeLiveSessionInclude,
  courseModules: { orderBy: { sortOrder: "asc" as const } },
} as const;

export const courseListResponseInclude = {
  discipline: { include: { domain: true } },
  liveSessions: activeLiveSessionInclude,
  courseModules: {
    select: {
      courseId: true,
      id: true,
      sortOrder: true,
      title: true,
      type: true,
      duration: true,
      attachmentUrl: true,
      attachmentName: true,
      sectionId: true,
      published: true,
    },
    orderBy: { sortOrder: "asc" as const },
  },
} as const;

export function getLiveStartedAt(course: any) {
  if (!course.isLiveNow) return null;
  const session = Array.isArray(course.liveSessions) ? course.liveSessions[0] : null;
  return session?.startTime ? new Date(session.startTime).toISOString() : null;
}

export function applyModuleProgressForStudent(course: Course, progress: StudentProgressSnapshot): Course {
  const modules = course.modules.map((module) => {
    const contentKey = getModuleContentProgressKey(module);
    return {
      ...module,
      completed: Boolean(
        module.completed ||
        progress.completedModuleIds.has(Number(module.id)) ||
        (contentKey ? progress.completedContentKeys.has(contentKey) : false),
      ),
    };
  });
  const { progressPercent } = getSyllabusChapterProgress(modules);
  return {
    ...course,
    modules,
    progress: progressPercent,
  };
}

export function toCourse(
  course: any,
  progress?: StudentProgressSnapshot,
  options?: { studentView?: boolean },
  enrollment?: CourseEnrollmentInfo | null,
): Course {
  const serialized: Course = {
    id: course.id,
    title: decodeStoredText(course.title),
    level: decodeStoredText(course.level),
    credits: course.credits,
    duration: decodeStoredText(course.duration),
    category: decodeStoredText(course.category),
    disciplineId: course.disciplineId,
    discipline: course.discipline ? toDiscipline(course.discipline) : undefined,
    price: coerceCoursePrice(course.price),
    freeAccessStartsAt: course.freeAccessStartsAt ? course.freeAccessStartsAt.toISOString() : null,
    freeAccessEndsAt: course.freeAccessEndsAt ? course.freeAccessEndsAt.toISOString() : null,
    freeAccessDurationDays: course.freeAccessDurationDays ?? null,
    iconName: course.iconName,
    color: course.color,
    instructor: decodeStoredText(course.instructor),
    description: decodeStoredText(course.description),
    progress: course.progress,
    isLiveNow: course.isLiveNow,
    liveSubject: course.liveSubject ? decodeStoredText(course.liveSubject) : undefined,
    liveStartedAt: getLiveStartedAt(course),
    modules: resolveCourseModules(
      {
        courseModules: course.courseModules,
      },
      progress?.completedModuleIds,
      options,
    ),
    published: course.published,
    createdById: course.createdById || undefined,
    enrollment: enrollment || null,
  };
  return progress ? applyModuleProgressForStudent(serialized, progress) : serialized;
}

export async function getStudentCompletedModuleIds(userId: string, courseId: number): Promise<Set<number>> {
  return (await getStudentProgressSnapshot(userId, courseId)).completedModuleIds;
}

export async function getStudentCompletedModuleIdsByCourseIds(
  userId: string,
  courseIds: number[],
): Promise<Map<number, Set<number>>> {
  const uniqueCourseIds = [...new Set(courseIds)];
  if (uniqueCourseIds.length === 0) return new Map();

  const snapshots = await getStudentProgressSnapshotsByCourseIds(userId, uniqueCourseIds);
  return new Map([...snapshots.entries()].map(([courseId, snapshot]) => [courseId, snapshot.completedModuleIds]));
}

export async function toCourseForUser(
  course: any,
  authUser: AppUser,
  completedModuleIds?: Set<number>,
): Promise<Course> {
  if (authUser.role !== "STUDENT") return toCourse(course);

  if (authUser.enrolledCourses.includes(course.id)) {
    const refreshed = await attachSyncedCourseModules([course], { includeContentMarkdown: true });
    course = refreshed[0] ?? course;
  }

  const enrollmentRecord = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: authUser.id, courseId: course.id } },
  });

  const enrollment = enrollmentRecord
    ? {
        startDate: enrollmentRecord.startDate.toISOString(),
        endDate: enrollmentRecord.endDate ? enrollmentRecord.endDate.toISOString() : null,
        active: enrollmentRecord.active,
      }
    : null;

  const progress = completedModuleIds
    ? { completedModuleIds, completedContentKeys: new Set<string>() }
    : await getStudentProgressSnapshot(authUser.id, course.id);
  return toCourse(course, progress, { studentView: true }, enrollment);
}

export async function toCoursesForStudent(
  courses: any[],
  userId: string,
  enrolledCourseIds: number[],
  enrollmentRecords?: Array<{ courseId: number; startDate: Date; endDate: Date | null; active: boolean }>,
  options?: { skipModuleSync?: boolean },
): Promise<Course[]> {
  const enrolledIds = enrolledCourseIds.filter((courseId) => courses.some((course) => course.id === courseId));
  if (enrolledIds.length > 0 && !options?.skipModuleSync) {
    courses = await attachSyncedCourseModules(courses);
  }

  const progressByCourse = await getStudentProgressSnapshotsByCourseIds(
    userId,
    courses.map((course) => course.id),
  );

  const enrollments =
    enrollmentRecords ??
    (await prisma.enrollment.findMany({
      where: { userId },
    }));
  const enrollmentMap = new Map<number, CourseEnrollmentInfo>();
  for (const e of enrollments) {
    if (!isEnrollmentActive(e)) continue;
    enrollmentMap.set(e.courseId, {
      startDate: e.startDate.toISOString(),
      endDate: e.endDate ? e.endDate.toISOString() : null,
      active: e.active,
    });
  }

  return courses.map((course) => {
    const enrollment = enrollmentMap.get(course.id) ?? null;
    return toCourse(
      course,
      progressByCourse.get(course.id) ?? { completedModuleIds: new Set(), completedContentKeys: new Set() },
      { studentView: true },
      enrollment,
    );
  });
}
