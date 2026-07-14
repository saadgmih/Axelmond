import { prisma } from "../db";
import { buildLiveReplayBody, buildLiveReplayTitle } from "../live/live-replay";
import { liveSessionJoinSelect } from "./mappers/live-mappers";

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
    select: {
      ...liveSessionJoinSelect,
      course: { select: { title: true, liveSubject: true } },
    },
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

    try {
      await tx.liveSession.update({
        where: { id: input.liveSessionId },
        data: {
          replayContentId: created.id,
          recordingStatus: "READY",
        },
      });
    } catch (err) {
      if (!isMissingLiveReplayColumnError(err)) throw err;
    }

    return created;
  });

  return content;
}

function isMissingLiveReplayColumnError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2022";
}

export async function markLiveSessionRecordingStatus(liveSessionId: string, recordingStatus: string) {
  try {
    await prisma.liveSession.update({
      where: { id: liveSessionId },
      data: { recordingStatus },
    });
  } catch (err) {
    if (isMissingLiveReplayColumnError(err)) return;
    throw err;
  }
}
