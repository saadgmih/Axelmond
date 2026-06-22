import { prisma } from "./db";
import { getNextCourseModuleId } from "./course-syllabus-modules";

import {
  LESSON_MODULE_LINK_PREFIX,
  QUIZ_MODULE_LINK_PREFIX,
  lessonContentLinkKey,
  quizModuleLinkKey,
  isLessonModuleLink,
  isQuizModuleLink,
  lessonContentIdFromModule,
  mapLessonTypeToModuleType,
} from "./course-curriculum-utils";

export {
  LESSON_MODULE_LINK_PREFIX,
  QUIZ_MODULE_LINK_PREFIX,
  lessonContentLinkKey,
  quizModuleLinkKey,
  isLessonModuleLink,
  isQuizModuleLink,
  lessonContentIdFromModule,
  mapLessonTypeToModuleType,
};

type CurriculumSyncClient = Pick<typeof prisma, "lessonContent" | "courseModule" | "quiz">;

/**
 * Mirror published curriculum lessonContent and quiz rows into courseModules so
 * the student course view stays in sync with teacher uploads.
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
      OR: [
        { sectionId: { startsWith: LESSON_MODULE_LINK_PREFIX } },
        { sectionId: { startsWith: QUIZ_MODULE_LINK_PREFIX } },
      ],
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

  const publishedQuizzes = await client.quiz.findMany({
    where: {
      courseId,
      published: true,
      OR: [{ sectionId: null }, { section: { published: true } }],
    },
    orderBy: [{ createdAt: "asc" }],
  });

  for (let index = 0; index < publishedQuizzes.length; index++) {
    const quiz = publishedQuizzes[index];
    const linkKey = quizModuleLinkKey(quiz.id);
    activeKeys.add(linkKey);
    const modulePayload = {
      title: quiz.title,
      type: "quiz",
      duration: "Quiz",
      contentMarkdown: null,
      attachmentUrl: null,
      attachmentName: null,
      sectionId: linkKey,
      published: true,
      sortOrder: publishedContents.length + index,
    };

    const existing = linkedByKey.get(linkKey);
    if (existing) {
      await client.courseModule.update({
        where: { courseId_id: { courseId, id: existing.id } },
        data: modulePayload,
      });
      if (quiz.moduleId !== existing.id) {
        await client.quiz.update({ where: { id: quiz.id }, data: { moduleId: existing.id } });
      }
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
    await client.quiz.update({ where: { id: quiz.id }, data: { moduleId: nextId } });
  }

  for (const moduleRow of linkedModules) {
    if (
      moduleRow.sectionId &&
      (isLessonModuleLink(moduleRow.sectionId) || isQuizModuleLink(moduleRow.sectionId)) &&
      !activeKeys.has(moduleRow.sectionId)
    ) {
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
  options?: { includeContentMarkdown?: boolean },
): Promise<T[]> {
  if (courses.length === 0) return courses;

  const selectFields: any = {
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
  };

  if (options?.includeContentMarkdown || (options?.includeContentMarkdown === undefined && courses.length === 1)) {
    selectFields.contentMarkdown = true;
  }

  const modules = await prisma.courseModule.findMany({
    where: { courseId: { in: courses.map((course) => course.id) } },
    select: selectFields,
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
