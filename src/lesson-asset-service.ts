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
