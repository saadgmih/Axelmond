import type { CourseModule } from "./types";
import { prisma } from "./db";

export type CourseModuleRow = {
  courseId: number;
  id: number;
  sortOrder: number;
  title: string;
  type: string;
  duration: string;
  contentMarkdown: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  sectionId: string | null;
  published: boolean;
};

export function serializeCourseModuleRow(row: CourseModuleRow, completed = false): CourseModule {
  return {
    id: row.id,
    title: row.title,
    type: row.type as CourseModule["type"],
    duration: row.duration,
    completed,
    contentMarkdown: row.contentMarkdown || undefined,
    attachmentUrl: row.attachmentUrl || undefined,
    attachmentName: row.attachmentName || undefined,
    sectionId: row.sectionId || undefined,
    published: row.published,
  };
}

export function courseModuleRowFromJsonItem(courseId: number, item: CourseModule, sortOrder: number): CourseModuleRow {
  return {
    courseId,
    id: item.id,
    sortOrder,
    title: item.title,
    type: item.type,
    duration: item.duration || "",
    contentMarkdown: item.contentMarkdown || null,
    attachmentUrl: item.attachmentUrl || null,
    attachmentName: item.attachmentName || null,
    sectionId: item.sectionId || null,
    published: item.published ?? true,
  };
}

export async function getNextCourseModuleId(
  courseId: number,
  client: Pick<typeof prisma, "courseModule"> = prisma,
): Promise<number> {
  const aggregate = await client.courseModule.aggregate({
    where: { courseId },
    _max: { id: true },
  });
  const maxId = aggregate._max.id ?? 0;
  return Math.max(maxId, 100) + 1;
}

export function resolveCourseModules(
  course: {
    courseModules?: CourseModuleRow[];
  },
  completedModuleIds?: Set<number>,
): CourseModule[] {
  if (!Array.isArray(course.courseModules) || course.courseModules.length === 0) {
    return [];
  }

  return course.courseModules
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((row) => serializeCourseModuleRow(row, completedModuleIds?.has(row.id) ?? false));
}
