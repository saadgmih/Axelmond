import { prisma } from "./db";
import { syncPublishedLessonModules } from "./course-curriculum-sync";
import { notifyPublishedLessonContent } from "./academic-notifications";
import { lessonAssetContentId, type ConfirmedLessonAsset, type LessonAssetIntent } from "./lesson-asset-confirmation";

export interface PersistLessonAssetInput {
  customId: string;
  userId: string;
  intent: LessonAssetIntent;
  file: ConfirmedLessonAsset;
}

function toAttachmentType(contentType: LessonAssetIntent["contentType"]) {
  if (contentType === "VIDEO") return "VIDEO" as const;
  if (contentType === "PDF") return "PDF" as const;
  return "IMAGE" as const;
}

export async function persistLessonAsset(input: PersistLessonAssetInput) {
  const contentId = lessonAssetContentId(input.customId);
  let created = false;
  let content;

  try {
    content = await prisma.lessonContent.create({
      data: {
        id: contentId,
        courseId: input.intent.courseId,
        sectionId: input.intent.sectionId,
        title: input.intent.title.trim(),
        type: input.intent.contentType,
        published: input.intent.published,
        status: "READY",
        createdById: input.userId,
        attachments: {
          create: {
            courseId: input.intent.courseId,
            type: toAttachmentType(input.intent.contentType),
            fileName: input.intent.fileName,
            fileKey: input.file.fileKey,
            url: input.file.url,
            mimeType: input.intent.mimeType || null,
            size: input.intent.size,
            createdById: input.userId,
          },
        },
      },
      include: { attachments: true },
    });
    created = true;
  } catch (error) {
    if ((error as { code?: string })?.code !== "P2002") throw error;
    content = await prisma.lessonContent.findUnique({
      where: { id: contentId },
      include: { attachments: true },
    });
    const attachment = content?.attachments[0];
    if (
      !content ||
      content.courseId !== input.intent.courseId ||
      content.sectionId !== input.intent.sectionId ||
      content.createdById !== input.userId ||
      attachment?.fileKey !== input.file.fileKey
    ) {
      throw error;
    }
  }

  if (created && content.published) {
    await notifyPublishedLessonContent({
      contentId: content.id,
      courseId: content.courseId,
      contentTitle: content.title,
      contentType: content.type,
      published: content.published,
      actorId: input.userId,
      sourceEvent: "LESSON_ASSET_PUBLISHED",
    });
  }
  if (content.published) {
    try {
      await syncPublishedLessonModules(content.courseId);
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] [ERROR] [curriculum] Lesson asset module sync failed ${JSON.stringify({ contentId: content.id, courseId: content.courseId, error: String(error) })}`,
      );
    }
  }

  return { content, created };
}

export interface ReuseLessonAssetInput {
  targetCourseId: number;
  targetSectionId?: string | null;
  title: string;
  contentType: "VIDEO" | "PDF" | "IMAGE";
  fileName: string;
  fileKey: string;
  url: string;
  mimeType?: string | null;
  size: number;
  published: boolean;
  userId: string;
  sourceContentId?: string;
}

export async function reuseLessonAsset(input: ReuseLessonAssetInput) {
  const maxOrder = await prisma.lessonContent.aggregate({
    where: { courseId: input.targetCourseId, sectionId: input.targetSectionId || null },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const content = await prisma.lessonContent.create({
    data: {
      courseId: input.targetCourseId,
      sectionId: input.targetSectionId || null,
      title: input.title.trim(),
      type: input.contentType,
      order: nextOrder,
      published: input.published,
      status: "READY",
      createdById: input.userId,
      attachments: {
        create: {
          courseId: input.targetCourseId,
          type: toAttachmentType(input.contentType),
          fileName: input.fileName,
          fileKey: input.fileKey,
          url: input.url,
          mimeType: input.mimeType || null,
          size: input.size,
          createdById: input.userId,
        },
      },
    },
    include: { attachments: true },
  });

  if (input.contentType === "VIDEO" && input.sourceContentId) {
    try {
      const sourceJob = await prisma.videoProcessingJob.findUnique({
        where: { contentId: input.sourceContentId },
      });
      if (sourceJob) {
        await prisma.videoProcessingJob.create({
          data: {
            contentId: content.id,
            uploadedByUserId: input.userId,
            sourceVideoPath: sourceJob.sourceVideoPath,
            outputVideoPath: sourceJob.outputVideoPath,
            sourceDuration: sourceJob.sourceDuration,
            outputDuration: sourceJob.outputDuration,
            outputSizeBytes: sourceJob.outputSizeBytes,
            status: sourceJob.status,
            progressPercent: 100,
            currentStep: "Média réutilisé et prêt pour la lecture.",
            introVersion: sourceJob.introVersion,
          },
        });
      }
    } catch (e) {
      console.error("Non-fatal: could not copy video job:", e);
    }
  }

  if (content.published) {
    await notifyPublishedLessonContent({
      contentId: content.id,
      courseId: content.courseId,
      contentTitle: content.title,
      contentType: content.type,
      published: content.published,
      actorId: input.userId,
      sourceEvent: "LESSON_ASSET_PUBLISHED",
    });
    try {
      await syncPublishedLessonModules(content.courseId);
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] [ERROR] [curriculum] Reused asset module sync failed ${JSON.stringify({ contentId: content.id, courseId: content.courseId, error: String(error) })}`,
      );
    }
  }

  return content;
}
