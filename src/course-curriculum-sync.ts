import { prisma } from "./db";
import { getNextCourseModuleId } from "./course-syllabus-modules";

import {
  LESSON_MODULE_LINK_PREFIX,
  lessonContentLinkKey,
  isLessonModuleLink,
  lessonContentIdFromModule,
  mapLessonTypeToModuleType,
} from "./course-curriculum-utils";

export {
  LESSON_MODULE_LINK_PREFIX,
  lessonContentLinkKey,
  isLessonModuleLink,
  lessonContentIdFromModule,
  mapLessonTypeToModuleType,
};

type CurriculumSyncClient = Pick<typeof prisma, "lessonContent" | "courseModule">;

/**
 * Mirror published curriculum lessonContent rows into courseModules so the student
 * course view (syllabus modules) stays in sync with teacher uploads.
 */
export async function syncPublishedLessonModules(
  courseId: number,
  client: CurriculumSyncClient = prisma,
): Promise<void> {
  const publishedContents = await client.lessonContent.findMany({
    where: {
      courseId,
      published: true,
      OR: [{ sectionId: null }, { section: { published: true } }],
    },
    include: {
      attachments: { orderBy: { createdAt: "asc" }, take: 1 },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const linkedModules = await client.courseModule.findMany({
    where: {
      courseId,
      sectionId: { startsWith: LESSON_MODULE_LINK_PREFIX },
    },
  });
  const linkedByKey = new Map(linkedModules.map((row) => [row.sectionId!, row]));
  const activeKeys = new Set<string>();

  for (let sortOrder = 0; sortOrder < publishedContents.length; sortOrder++) {
    const content = publishedContents[sortOrder];
    const linkKey = lessonContentLinkKey(content.id);
    activeKeys.add(linkKey);
    const attachment = content.attachments[0];
    const modulePayload = {
      title: content.title,
      type: mapLessonTypeToModuleType(content.type),
      duration: "—",
      contentMarkdown: content.type === "TEXT" ? content.body : null,
      attachmentUrl: attachment?.url ?? null,
      attachmentName: attachment?.fileName ?? null,
      sectionId: linkKey,
      published: true,
      sortOrder,
    };

    const existing = linkedByKey.get(linkKey);
    if (existing) {
      await client.courseModule.update({
        where: { courseId_id: { courseId, id: existing.id } },
        data: modulePayload,
      });
      continue;
    }

    const nextId = await getNextCourseModuleId(courseId);
    await client.courseModule.create({
      data: {
        courseId,
        id: nextId,
        ...modulePayload,
      },
    });
  }

  for (const moduleRow of linkedModules) {
    if (moduleRow.sectionId && !activeKeys.has(moduleRow.sectionId)) {
      await client.courseModule.delete({
        where: { courseId_id: { courseId, id: moduleRow.id } },
      });
    }
  }
}

export async function syncPublishedLessonModulesForCourses(courseIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(courseIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (uniqueIds.length === 0) return;
  await Promise.all(uniqueIds.map((courseId) => syncPublishedLessonModules(courseId)));
}

export async function attachSyncedCourseModules<T extends { id: number; courseModules?: unknown[] }>(
  courses: T[],
): Promise<T[]> {
  if (courses.length === 0) return courses;
  const modules = await prisma.courseModule.findMany({
    where: { courseId: { in: courses.map((course) => course.id) } },
    orderBy: [{ courseId: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });
  const modulesByCourseId = new Map<number, typeof modules>();
  for (const row of modules) {
    const bucket = modulesByCourseId.get(row.courseId);
    if (bucket) {
      bucket.push(row);
    } else {
      modulesByCourseId.set(row.courseId, [row]);
    }
  }
  return courses.map((course) => ({
    ...course,
    courseModules: modulesByCourseId.get(course.id) ?? course.courseModules ?? [],
  }));
}
