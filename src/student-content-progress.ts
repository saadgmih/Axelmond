import { prisma } from "./db";
import { isLessonModuleLink, isQuizModuleLink } from "./course-curriculum-utils";

export type StudentProgressSnapshot = {
  completedModuleIds: Set<number>;
  completedContentKeys: Set<string>;
};

type ProgressModule = {
  id: number;
  sectionId?: string | null;
};

type ProgressClient = Pick<typeof prisma, "moduleProgress" | "studentContentProgress">;

export function getModuleContentProgressKey(module: ProgressModule): string | null {
  if (isLessonModuleLink(module.sectionId) || isQuizModuleLink(module.sectionId)) return module.sectionId!;
  return null;
}

export function getContentProgressType(contentKey: string): string {
  if (isQuizModuleLink(contentKey)) return "QUIZ";
  return "LESSON";
}

export async function getStudentProgressSnapshot(
  userId: string,
  courseId: number,
  client: ProgressClient = prisma,
): Promise<StudentProgressSnapshot> {
  const [moduleRows, contentRows] = await Promise.all([
    client.moduleProgress.findMany({
      where: { userId, courseId },
      select: { moduleId: true },
    }),
    client.studentContentProgress.findMany({
      where: { userId, courseId },
      select: { contentKey: true },
    }),
  ]);

  return {
    completedModuleIds: new Set(moduleRows.map((row) => row.moduleId)),
    completedContentKeys: new Set(contentRows.map((row) => row.contentKey)),
  };
}

export async function getStudentProgressSnapshotsByCourseIds(
  userId: string,
  courseIds: number[],
  client: ProgressClient = prisma,
): Promise<Map<number, StudentProgressSnapshot>> {
  const uniqueCourseIds = [...new Set(courseIds.filter((courseId) => Number.isInteger(courseId) && courseId > 0))];
  const byCourse = new Map<number, StudentProgressSnapshot>();
  for (const courseId of uniqueCourseIds) {
    byCourse.set(courseId, { completedModuleIds: new Set(), completedContentKeys: new Set() });
  }
  if (uniqueCourseIds.length === 0) return byCourse;

  const [moduleRows, contentRows] = await Promise.all([
    client.moduleProgress.findMany({
      where: { userId, courseId: { in: uniqueCourseIds } },
      select: { courseId: true, moduleId: true },
    }),
    client.studentContentProgress.findMany({
      where: { userId, courseId: { in: uniqueCourseIds } },
      select: { courseId: true, contentKey: true },
    }),
  ]);

  for (const row of moduleRows) {
    byCourse.get(row.courseId)?.completedModuleIds.add(row.moduleId);
  }
  for (const row of contentRows) {
    byCourse.get(row.courseId)?.completedContentKeys.add(row.contentKey);
  }

  return byCourse;
}

export async function setStudentModuleCompletion(
  params: {
    userId: string;
    courseId: number;
    module: ProgressModule;
    completed: boolean;
  },
  client: ProgressClient = prisma,
): Promise<void> {
  const contentKey = getModuleContentProgressKey(params.module);

  if (contentKey) {
    if (params.completed) {
      await client.studentContentProgress.upsert({
        where: {
          userId_courseId_contentKey: {
            userId: params.userId,
            courseId: params.courseId,
            contentKey,
          },
        },
        create: {
          userId: params.userId,
          courseId: params.courseId,
          moduleId: params.module.id,
          contentKey,
          contentType: getContentProgressType(contentKey),
        },
        update: {
          moduleId: params.module.id,
          contentType: getContentProgressType(contentKey),
          completedAt: new Date(),
        },
      });
    } else {
      await client.studentContentProgress.deleteMany({
        where: { userId: params.userId, courseId: params.courseId, contentKey },
      });
    }
  }

  if (params.completed) {
    await client.moduleProgress.upsert({
      where: {
        userId_courseId_moduleId: {
          userId: params.userId,
          courseId: params.courseId,
          moduleId: params.module.id,
        },
      },
      create: { userId: params.userId, courseId: params.courseId, moduleId: params.module.id },
      update: {},
    });
    return;
  }

  await client.moduleProgress.deleteMany({
    where: { userId: params.userId, courseId: params.courseId, moduleId: params.module.id },
  });
}
