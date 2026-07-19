import { prisma } from "../db";
import { processVideoJob } from "./video-branding-service";
import { getBrandingConfig, shouldQueueVideoBranding } from "./video-branding-config";

let workerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

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
      console.log(`[video-branding-worker] Starting processing of job: ${nextJob.id}`);

      // Update status to QUEUED / Processing start
      await prisma.videoProcessingJob.update({
        where: { id: nextJob.id },
        data: { status: "QUEUED", currentStep: "Démarrage du traitement..." },
      });

      await processVideoJob(nextJob.id);
    }
  } catch (error) {
    console.error("[video-branding-worker] Error in polling loop:", error);
  } finally {
    isProcessing = false;
  }
}

export async function startVideoBrandingWorker() {
  if (workerInterval) return;

  const config = await getBrandingConfig();
  if (!shouldQueueVideoBranding(config)) {
    console.log("[video-branding-worker] Disabled for this runtime; original uploaded videos remain playable.");
    return;
  }

  console.log("[video-branding-worker] Starting video branding worker queue...");
  await resetInterruptedJobs();

  // Poll immediately and then every 5 seconds
  pollAndProcessJobs();
  workerInterval = setInterval(pollAndProcessJobs, 5000);
}

export function stopVideoBrandingWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("[video-branding-worker] Stopped video branding worker queue.");
  }
}
