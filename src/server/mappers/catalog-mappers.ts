import { Course } from "../../types";
import { prisma } from "../../db";
import { decodeStoredText } from "../../text";
import {
  attachSyncedCourseModules,
  syncPublishedLessonModules,
  syncPublishedLessonModulesForCourses,
} from "../../course-curriculum-sync";
import { resolveCourseModules } from "../../course-syllabus-modules";
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

export const activeLiveSessionInclude = {
  where: { isActive: true, endTime: null },
  orderBy: { startTime: "asc" },
  take: 1,
} as const;

export const courseResponseInclude = {
  discipline: { include: { domain: true } },
  liveSessions: activeLiveSessionInclude,
  courseModules: { orderBy: { sortOrder: "asc" as const } },
} as const;

export function getLiveStartedAt(course: any) {
  if (!course.isLiveNow) return null;
  const session = Array.isArray(course.liveSessions) ? course.liveSessions[0] : null;
  return session?.startTime ? new Date(session.startTime).toISOString() : null;
}

export function applyModuleProgressForStudent(course: Course, completedModuleIds: Set<number>): Course {
  if (completedModuleIds.size === 0) return course;
  const modules = course.modules.map((module) => ({
    ...module,
    completed: Boolean(module.completed || completedModuleIds.has(Number(module.id))),
  }));
  const totalCount = modules.length;
  const completedCount = modules.filter((module) => module.completed).length;
  return {
    ...course,
    modules,
    progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
  };
}

export function toCourse(course: any, completedModuleIds?: Set<number>, options?: { studentView?: boolean }): Course {
  const serialized: Course = {
    id: course.id,
    title: decodeStoredText(course.title),
    level: decodeStoredText(course.level),
    credits: course.credits,
    duration: decodeStoredText(course.duration),
    category: decodeStoredText(course.category),
    disciplineId: course.disciplineId,
    discipline: course.discipline ? toDiscipline(course.discipline) : undefined,
    price: course.price,
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
      completedModuleIds,
      options,
    ),
    published: course.published,
    createdById: course.createdById || undefined,
  };
  return completedModuleIds ? applyModuleProgressForStudent(serialized, completedModuleIds) : serialized;
}

export async function getStudentCompletedModuleIds(userId: string, courseId: number): Promise<Set<number>> {
  const rows = await prisma.moduleProgress.findMany({
    where: { userId, courseId },
    select: { moduleId: true },
  });
  return new Set(rows.map((row) => row.moduleId));
}

export async function getStudentCompletedModuleIdsByCourseIds(
  userId: string,
  courseIds: number[],
): Promise<Map<number, Set<number>>> {
  const uniqueCourseIds = [...new Set(courseIds)];
  if (uniqueCourseIds.length === 0) return new Map();

  const rows = await prisma.moduleProgress.findMany({
    where: { userId, courseId: { in: uniqueCourseIds } },
    select: { courseId: true, moduleId: true },
  });

  const byCourse = new Map<number, Set<number>>();
  for (const courseId of uniqueCourseIds) {
    byCourse.set(courseId, new Set());
  }
  for (const row of rows) {
    byCourse.get(row.courseId)!.add(row.moduleId);
  }
  return byCourse;
}

export async function toCourseForUser(
  course: any,
  authUser: AppUser,
  completedModuleIds?: Set<number>,
): Promise<Course> {
  if (authUser.role !== "STUDENT") return toCourse(course);

  if (authUser.enrolledCourses.includes(course.id)) {
    await syncPublishedLessonModules(course.id);
    const refreshed = await attachSyncedCourseModules([course]);
    course = refreshed[0] ?? course;
  }

  const moduleIds = completedModuleIds ?? (await getStudentCompletedModuleIds(authUser.id, course.id));
  return toCourse(course, moduleIds, { studentView: true });
}

export async function toCoursesForStudent(
  courses: any[],
  userId: string,
  enrolledCourseIds: number[],
): Promise<Course[]> {
  const enrolledIds = enrolledCourseIds.filter((courseId) => courses.some((course) => course.id === courseId));
  if (enrolledIds.length > 0) {
    await syncPublishedLessonModulesForCourses(enrolledIds);
    courses = await attachSyncedCourseModules(courses);
  }

  const progressByCourse = await getStudentCompletedModuleIdsByCourseIds(
    userId,
    courses.map((course) => course.id),
  );
  return courses.map((course) =>
    toCourse(course, progressByCourse.get(course.id) ?? new Set(), { studentView: true }),
  );
}