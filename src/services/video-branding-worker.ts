import { prisma } from "../db";
import { processVideoJob, verifyVideoBrandingTools } from "./video-branding-service";
import { getBrandingConfig, shouldQueueVideoBranding } from "./video-branding-config";

let workerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;
let activeJobAbortController: AbortController | null = null;
let activeJobPromise: Promise<void> | null = null;
let activeJobHeartbeat: NodeJS.Timeout | null = null;
const INTERRUPTED_JOB_STALE_MS = 2 * 60 * 1000;
const ACTIVE_JOB_HEARTBEAT_MS = 30 * 1000;
const TOOL_FAILURE_PATTERN =
  /(?:spawn\s+\S*(?:ffmpeg|ffprobe)\S*.*(?:ENOENT|EACCES)|outils vidéo indisponibles|error while opening encoder for output stream)/i;

export async function queueUnbrandedVideoJobs(introVersion: number): Promise<number> {
  const videos = await prisma.lessonContent.findMany({
    where: {
      type: "VIDEO",
      attachments: { some: { type: "VIDEO" } },
    },
    select: {
      id: true,
      createdById: true,
      attachments: {
        where: { type: "VIDEO" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { url: true, createdById: true },
      },
    },
  });

  if (videos.length === 0) return 0;

  const existingJobs = await prisma.videoProcessingJob.findMany({
    where: { contentId: { in: videos.map((video) => video.id) } },
    select: { id: true, contentId: true, status: true, currentStep: true, errorMessage: true },
  });
  const contentIdsWithJobs = new Set(existingJobs.map((job) => job.contentId));
  const videosById = new Map(videos.map((video) => [video.id, video]));
  const jobsToRecover = existingJobs.flatMap((job) => {
    const failureDetails = `${job.currentStep || ""}\n${job.errorMessage || ""}`;
    if (job.status !== "FAILED" || !TOOL_FAILURE_PATTERN.test(failureDetails)) return [];
    const video = videosById.get(job.contentId);
    const attachment = video?.attachments[0];
    const uploadedByUserId = video?.createdById || attachment?.createdById;
    if (!attachment?.url || !uploadedByUserId) return [];
    return [{ id: job.id, contentId: job.contentId, sourceVideoPath: attachment.url, uploadedByUserId }];
  });
  const jobsToCreate = videos.flatMap((video) => {
    if (contentIdsWithJobs.has(video.id)) return [];
    const attachment = video.attachments[0];
    const uploadedByUserId = video.createdById || attachment?.createdById;
    if (!attachment?.url || !uploadedByUserId) {
      console.warn(`[video-branding-worker] Cannot backfill video ${video.id}: source or owner is missing.`);
      return [];
    }
    return [
      {
        contentId: video.id,
        uploadedByUserId,
        sourceVideoPath: attachment.url,
        status: "UPLOADED" as const,
        progressPercent: 0,
        currentStep: "Vidéo existante en attente de l'intro Performance Académique...",
        introVersion,
      },
    ];
  });

  if (jobsToCreate.length === 0 && jobsToRecover.length === 0) return 0;

  const queuedCount = await prisma.$transaction(async (tx) => {
    const recoveredResults = await Promise.all(
      jobsToRecover.map((job) =>
        tx.videoProcessingJob.updateMany({
          where: { id: job.id, status: "FAILED" },
          data: {
            uploadedByUserId: job.uploadedByUserId,
            sourceVideoPath: job.sourceVideoPath,
            status: "QUEUED",
            progressPercent: 0,
            currentStep: "Nouvelle tentative avec les outils vidéo intégrés...",
            errorMessage: null,
            introVersion,
          },
        }),
      ),
    );
    const created = await tx.videoProcessingJob.createMany({
      data: jobsToCreate,
      skipDuplicates: true,
    });
    const recoveredCount = recoveredResults.reduce((total, result) => total + result.count, 0);
    await tx.lessonContent.updateMany({
      where: {
        id: { in: [...jobsToCreate.map((job) => job.contentId), ...jobsToRecover.map((job) => job.contentId)] },
      },
      data: { status: "PROCESSING" },
    });
    return created.count + recoveredCount;
  });

  if (queuedCount > 0) {
    console.log(`[video-branding-worker] Queued ${queuedCount} existing unbranded video(s).`);
  }
  return queuedCount;
}

async function resetInterruptedJobs() {
  try {
    const interruptedStates = [
      "QUEUED",
      "VALIDATING",
      "PROBING",
      "NORMALIZING",
      "ADDING_INTRO",
      "ENCODING",
      "VERIFYING",
    ];

    const result = await prisma.videoProcessingJob.updateMany({
      where: {
        status: { in: interruptedStates as any },
        updatedAt: { lt: new Date(Date.now() - INTERRUPTED_JOB_STALE_MS) },
      },
      data: {
        status: "QUEUED",
        currentStep: "En attente de reprise après redémarrage...",
      },
    });

    if (result.count > 0) {
      console.log(`[video-branding-worker] Reset ${result.count} interrupted video jobs back to QUEUED.`);
    }
  } catch (error) {
    console.error("[video-branding-worker] Failed to reset interrupted jobs:", error);
  }
}

async function pollAndProcessJobs() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Find the next job in QUEUED or UPLOADED status
    const nextJob = await prisma.videoProcessingJob.findFirst({
      where: {
        status: { in: ["UPLOADED", "QUEUED"] },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (nextJob) {
      const claimed = await prisma.videoProcessingJob.updateMany({
        where: { id: nextJob.id, status: { in: ["UPLOADED", "QUEUED"] } },
        data: { status: "VALIDATING", currentStep: "Démarrage du traitement..." },
      });
      if (claimed.count === 0) return;

      console.log(`[video-branding-worker] Starting processing of job: ${nextJob.id}`);
      activeJobAbortController = new AbortController();
      activeJobHeartbeat = setInterval(() => {
        void prisma.videoProcessingJob
          .update({ where: { id: nextJob.id }, data: { updatedAt: new Date() } })
          .catch((error) => console.warn("[video-branding-worker] Failed to heartbeat active job:", error));
      }, ACTIVE_JOB_HEARTBEAT_MS);
      activeJobHeartbeat.unref();
      activeJobPromise = processVideoJob(nextJob.id, activeJobAbortController.signal);
      await activeJobPromise;
    }
  } catch (error) {
    console.error("[video-branding-worker] Error in polling loop:", error);
  } finally {
    if (activeJobHeartbeat) clearInterval(activeJobHeartbeat);
    activeJobHeartbeat = null;
    activeJobAbortController = null;
    activeJobPromise = null;
    isProcessing = false;
  }
}

export async function startVideoBrandingWorker() {
  if (workerInterval) return;

  const config = await getBrandingConfig();
  if (!shouldQueueVideoBranding(config)) {
    console.log("[video-branding-worker] Disabled by configuration.");
    return;
  }

  await verifyVideoBrandingTools();
  console.log("[video-branding-worker] Starting video branding worker queue...");
  await resetInterruptedJobs();
  await queueUnbrandedVideoJobs(config.introVersion);

  // Poll immediately and then every 5 seconds
  pollAndProcessJobs();
  workerInterval = setInterval(pollAndProcessJobs, 5000);
}

export async function stopVideoBrandingWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
  const processing = activeJobPromise;
  activeJobAbortController?.abort();
  if (processing) await processing.catch(() => undefined);
  console.log("[video-branding-worker] Stopped video branding worker queue.");
}
