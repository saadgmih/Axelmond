import { prisma } from "../db";
import { buildLiveReplayBody, buildLiveReplayTitle } from "../live/live-replay";
import { syncPublishedLessonModules } from "../course-curriculum-sync";

type CompleteLiveReplayUploadInput = {
  userId: string;
  courseId: number;
  liveSessionId: string;
  title?: string;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string | null;
  size: number;
};

export async function completeLiveReplayUpload(input: CompleteLiveReplayUploadInput) {
  const session = await prisma.liveSession.findFirst({
    where: { id: input.liveSessionId, courseId: input.courseId },
    include: { course: { select: { title: true, liveSubject: true } } },
  });
  if (!session) {
    throw new Error("Session live introuvable pour cette rediffusion.");
  }

  const title =
    input.title?.trim() ||
    buildLiveReplayTitle(session.course.title, session.title || session.course.liveSubject, new Date());

  const content = await prisma.$transaction(async (tx) => {
    const created = await tx.lessonContent.create({
      data: {
        courseId: input.courseId,
        sectionId: null,
        title,
        type: "VIDEO",
        body: buildLiveReplayBody(input.liveSessionId),
        published: false,
        createdById: input.userId,
        attachments: {
          create: {
            courseId: input.courseId,
            type: "VIDEO",
            fileName: input.fileName,
            fileKey: input.fileKey,
            url: input.fileUrl,
            mimeType: input.mimeType,
            size: input.size,
            createdById: input.userId,
          },
        },
      },
      include: { attachments: true },
    });

    await tx.liveSession.update({
      where: { id: input.liveSessionId },
      data: {
        replayContentId: created.id,
        recordingStatus: "READY",
      },
    });

    return created;
  });

  return content;
}

export async function markLiveSessionRecordingStatus(liveSessionId: string, recordingStatus: string) {
  await prisma.liveSession.update({
    where: { id: liveSessionId },
    data: { recordingStatus },
  });
}
