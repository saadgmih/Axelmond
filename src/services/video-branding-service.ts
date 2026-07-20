import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { prisma } from "../db";
import { utapi } from "../uploadthing-api";
import { getBrandingConfig, VideoIntroConfig } from "./video-branding-config";
import { syncPublishedLessonModules } from "../course-curriculum-sync";
import { notifyPublishedLessonContent } from "../academic-notifications";
import {
  getVideoBrandingBinaryInfo,
  getVideoBrandingExecutable,
  type VideoBrandingExecutable,
} from "./video-branding-binaries";

export interface VideoInfo {
  width: number;
  height: number;
  duration: number;
  hasAudio: boolean;
  sizeBytes: number;
}

const MAX_BRANDING_LONG_EDGE = 1280;
const LOW_MEMORY_VIDEO_ENCODING_ARGS = [
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-threads",
  "1",
  "-crf",
  "23",
  "-pix_fmt",
  "yuv420p",
  "-r",
  "30",
];

export function getBrandingTargetDimensions(width: number, height: number): { width: number; height: number } {
  const safeWidth = Math.max(2, Math.floor(width));
  const safeHeight = Math.max(2, Math.floor(height));
  const scale = Math.min(1, MAX_BRANDING_LONG_EDGE / Math.max(safeWidth, safeHeight));
  const even = (value: number) => Math.max(2, Math.floor((value * scale) / 2) * 2);
  return { width: even(safeWidth), height: even(safeHeight) };
}

export function runCommand(
  executable: VideoBrandingExecutable,
  args: string[],
  signal?: AbortSignal,
): Promise<{ stdout: string; stderr: string }> {
  const resolvedExecutable = getVideoBrandingExecutable(executable);
  return new Promise((resolve, reject) => {
    execFile(resolvedExecutable, args, { maxBuffer: 10 * 1024 * 1024, signal }, (err, stdout, stderr) => {
      if (err) {
        return reject(
          new Error(
            `Failed to run ${executable} (${resolvedExecutable}) ${args.join(" ")}: ${err.message}\nStderr: ${stderr}`,
          ),
        );
      }
      resolve({ stdout, stderr });
    });
  });
}

export function isVideoBrandingToolUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /spawn .*ff(?:mpeg|probe)(?:\.exe)? (?:ENOENT|EACCES)/i.test(message);
}

export async function verifyVideoBrandingTools(): Promise<void> {
  const binaries = getVideoBrandingBinaryInfo();
  await Promise.all([runCommand("ffmpeg", ["-version"]), runCommand("ffprobe", ["-version"])]);
  console.log("[branding-service] Bundled video tools are ready.", {
    ffmpegVersion: binaries.ffmpegVersion,
    ffprobeVersion: binaries.ffprobeVersion,
  });
}

function concatFileEntry(filePath: string): string {
  const portablePath = path.resolve(filePath).replace(/\\/g, "/").replace(/'/g, "'\\''");
  return `file '${portablePath}'`;
}

export async function probeVideo(filePath: string, signal?: AbortSignal): Promise<VideoInfo> {
  const { stdout } = await runCommand("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration,size",
    "-show_streams",
    "-of",
    "json",
    filePath,
  ], signal);

  const data = JSON.parse(stdout);
  const videoStream = data.streams?.find((s: any) => s.codec_type === "video");
  const audioStream = data.streams?.find((s: any) => s.codec_type === "audio");

  if (!videoStream) {
    throw new Error("No video stream found in the file.");
  }

  const width = parseInt(videoStream.width || "0", 10);
  const height = parseInt(videoStream.height || "0", 10);
  const duration = parseFloat(data.format?.duration || videoStream.duration || "0");
  const sizeBytes = parseInt(data.format?.size || "0", 10);
  const hasAudio = !!audioStream;

  return { width, height, duration, hasAudio, sizeBytes };
}

async function resolveIntroFile(urlOrPath: string, filename: string): Promise<string> {
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    const localDir = path.join(process.cwd(), "videos", "intros");
    fs.mkdirSync(localDir, { recursive: true });
    const localPath = path.join(localDir, filename);
    if (!fs.existsSync(localPath)) {
      console.log(`[branding-service] Downloading intro from ${urlOrPath}...`);
      const res = await fetch(urlOrPath);
      if (!res.ok) throw new Error(`Failed to download intro: ${res.statusText}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(localPath, buffer);
    }
    return localPath;
  }
  return path.resolve(process.cwd(), urlOrPath);
}

export async function ensureDefaultIntros(config: VideoIntroConfig) {
  if (config.introFilePathLandscape.startsWith("http") || config.introFilePathPortrait.startsWith("http")) {
    // Will be downloaded on demand
    return;
  }

  const landscapePath = path.resolve(process.cwd(), config.introFilePathLandscape);
  const portraitPath = path.resolve(process.cwd(), config.introFilePathPortrait);

  fs.mkdirSync(path.dirname(landscapePath), { recursive: true });
  fs.mkdirSync(path.dirname(portraitPath), { recursive: true });

  if (!fs.existsSync(landscapePath)) {
    console.log("[branding-service] Generating default landscape intro...");
    await runCommand("ffmpeg", [
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=1280x720:d=5",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=cl=stereo:r=48000",
      ...LOW_MEMORY_VIDEO_ENCODING_ARGS,
      "-t",
      "5",
      "-c:a",
      "aac",
      "-shortest",
      landscapePath,
      "-y",
    ]);
  }

  if (!fs.existsSync(portraitPath)) {
    console.log("[branding-service] Generating default portrait intro...");
    await runCommand("ffmpeg", [
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=720x1280:d=5",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=cl=stereo:r=48000",
      ...LOW_MEMORY_VIDEO_ENCODING_ARGS,
      "-t",
      "5",
      "-c:a",
      "aac",
      "-shortest",
      portraitPath,
      "-y",
    ]);
  }
}

export async function processVideoJob(jobId: string, signal?: AbortSignal): Promise<void> {
  const job = await prisma.videoProcessingJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  const config = await getBrandingConfig();
  await ensureDefaultIntros(config);

  const workDir = path.join(process.cwd(), "videos", "working", jobId);
  fs.mkdirSync(workDir, { recursive: true });

  const originalPath = path.join(workDir, "original.mp4");
  const normalizedIntroPath = path.join(workDir, "normalized_intro.mp4");
  const normalizedUserPath = path.join(workDir, "normalized_user.mp4");
  const finalOutputPath = path.join(workDir, "final.mp4");
  const thumbnailPath = path.join(workDir, "thumbnail.jpg");
  const runJobCommand = (executable: VideoBrandingExecutable, args: string[]) => runCommand(executable, args, signal);
  const throwIfJobAborted = () => {
    if (signal?.aborted) throw new DOMException("Video branding interrupted by shutdown", "AbortError");
  };

  try {
    // 1. Download original video if it's a URL
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: { status: "VALIDATING", currentStep: "Téléchargement de la vidéo originale...", startedAt: new Date() },
    });

    console.log(`[branding-service] Downloading source video from ${job.sourceVideoPath}...`);
    const response = await fetch(job.sourceVideoPath, { signal });
    if (!response.ok) {
      throw new Error(`Failed to download source video: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    throwIfJobAborted();
    fs.writeFileSync(originalPath, buffer);

    // 2. Probing source video
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: { status: "PROBING", currentStep: "Analyse des codecs et dimensions..." },
    });

    const info = await probeVideo(originalPath, signal);
    console.log(`[branding-service] Probed video info:`, info);

    // Validation checks
    if (info.sizeBytes > 2 * 1024 * 1024 * 1024) {
      throw new Error("La taille de la vidéo dépasse la limite autorisée de 2 Go.");
    }
    if (info.duration > 4 * 60 * 60) {
      throw new Error("La durée de la vidéo dépasse la limite autorisée de 4 heures.");
    }

    // Preserve the uploaded resolution without upscaling and cap large videos at 720p-equivalent.
    // A single x264 thread keeps memory usage predictable on constrained web-app hosting.
    const isLandscape = info.width >= info.height;
    const target = getBrandingTargetDimensions(info.width, info.height);
    const targetW = target.width;
    const targetH = target.height;

    const rawIntroPath = isLandscape ? config.introFilePathLandscape : config.introFilePathPortrait;
    const introPath = await resolveIntroFile(rawIntroPath, isLandscape ? "intro-landscape.mp4" : "intro-portrait.mp4");

    // 3. Normalizing intro and video
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: {
        status: "NORMALIZING",
        currentStep: "Normalisation du format...",
        sourceDuration: info.duration,
        sourceSizeBytes: info.sizeBytes,
      },
    });

    // Normalize intro
    console.log(`[branding-service] Normalizing intro to match target resolution ${targetW}x${targetH}...`);
    await runJobCommand("ffmpeg", [
      "-i",
      introPath,
      "-vf",
      `scale=w=${targetW}:h=${targetH}:force_original_aspect_ratio=decrease,pad=w=${targetW}:h=${targetH}:x=(${targetW}-iw)/2:y=(${targetH}-ih)/2:color=black,fps=30`,
      ...LOW_MEMORY_VIDEO_ENCODING_ARGS,
      "-c:a",
      "aac",
      "-ar",
      "48000",
      "-ac",
      "2",
      normalizedIntroPath,
      "-y",
    ]);

    // Normalize user video
    console.log(`[branding-service] Normalizing user video (hasAudio: ${info.hasAudio})...`);
    if (info.hasAudio) {
      await runJobCommand("ffmpeg", [
        "-i",
        originalPath,
        "-vf",
        `scale=w=${targetW}:h=${targetH}:force_original_aspect_ratio=decrease,pad=w=${targetW}:h=${targetH}:x=(${targetW}-iw)/2:y=(${targetH}-ih)/2:color=black,fps=30`,
        ...LOW_MEMORY_VIDEO_ENCODING_ARGS,
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        normalizedUserPath,
        "-y",
      ]);
    } else {
      // Add silent audio stream
      await runJobCommand("ffmpeg", [
        "-i",
        originalPath,
        "-f",
        "lavfi",
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-vf",
        `scale=w=${targetW}:h=${targetH}:force_original_aspect_ratio=decrease,pad=w=${targetW}:h=${targetH}:x=(${targetW}-iw)/2:y=(${targetH}-ih)/2:color=black,fps=30`,
        ...LOW_MEMORY_VIDEO_ENCODING_ARGS,
        "-c:a",
        "aac",
        "-shortest",
        normalizedUserPath,
        "-y",
      ]);
    }

    // 4. Concatenate
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: { status: "ADDING_INTRO", currentStep: "Ajout de l'intro Performance Académique..." },
    });

    const concatListPath = path.join(workDir, "concat.txt");
    fs.writeFileSync(
      concatListPath,
      `${concatFileEntry(normalizedIntroPath)}\n${concatFileEntry(normalizedUserPath)}\n`,
    );

    console.log(`[branding-service] Concatenating intro and user video...`);
    await runJobCommand("ffmpeg", [
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatListPath,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      finalOutputPath,
      "-y",
    ]);

    // 5. Verify processed video
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: { status: "VERIFYING", currentStep: "Vérification de la vidéo finale..." },
    });

    const finalInfo = await probeVideo(finalOutputPath, signal);
    console.log(`[branding-service] Processed video info:`, finalInfo);

    const expectedDuration = config.introDuration + info.duration;
    if (Math.abs(finalInfo.duration - expectedDuration) > 1.5) {
      throw new Error(
        `La durée de la vidéo finale (${finalInfo.duration}s) ne correspond pas à la durée attendue (${expectedDuration}s).`,
      );
    }

    // 6. Generate thumbnail from the main video content
    const thumbTime = config.introDuration + Math.min(2.0, info.duration / 2);
    console.log(`[branding-service] Generating thumbnail at timestamp ${thumbTime}s...`);
    await runJobCommand("ffmpeg", [
      "-ss",
      String(thumbTime),
      "-i",
      finalOutputPath,
      "-threads",
      "1",
      "-vframes",
      "1",
      "-q:v",
      "2",
      thumbnailPath,
      "-y",
    ]);

    // 7. Upload final video and thumbnail to UploadThing
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: { status: "ENCODING", currentStep: "Téléversement des fichiers finaux..." },
    });

    console.log(`[branding-service] Uploading final files to UploadThing...`);
    const finalVideoBuffer = fs.readFileSync(finalOutputPath);
    const finalVideoFile = new globalThis.File([finalVideoBuffer], `${jobId}-final.mp4`, { type: "video/mp4" });

    const thumbBuffer = fs.readFileSync(thumbnailPath);
    const thumbFile = new globalThis.File([thumbBuffer], `${jobId}-thumb.jpg`, { type: "image/jpeg" });

    const uploadResults = await utapi.uploadFiles([finalVideoFile, thumbFile]);
    throwIfJobAborted();
    const videoUpload = uploadResults[0];
    const thumbUpload = uploadResults[1];

    if (!videoUpload?.data || !thumbUpload?.data) {
      throw new Error(
        `Upload to UploadThing failed. Video: ${JSON.stringify(videoUpload?.error)}, Thumb: ${JSON.stringify(thumbUpload?.error)}`,
      );
    }

    console.log(`[branding-service] Final upload complete:`, {
      videoUrl: videoUpload.data.url,
      thumbUrl: thumbUpload.data.url,
    });

    // 8. Update database and publish
    await prisma.$transaction(async (tx) => {
      // Update attachments for the content
      const content = await tx.lessonContent.findUnique({
        where: { id: job.contentId },
        include: { attachments: true },
      });

      if (content) {
        // Delete old attachment from UploadThing
        const oldAttachment = content.attachments[0];
        if (oldAttachment) {
          await tx.attachment.update({
            where: { id: oldAttachment.id },
            data: {
              url: videoUpload.data.url,
              fileKey: videoUpload.data.key,
              size: finalVideoBuffer.length,
            },
          });
        }

        // Update LessonContent status to READY
        await tx.lessonContent.update({
          where: { id: job.contentId },
          data: { status: "READY" },
        });
      }
    });

    // Sync curriculum module
    const content = await prisma.lessonContent.findUnique({ where: { id: job.contentId } });
    if (content?.published) {
      await syncPublishedLessonModules(content.courseId);
      // Send notification
      await notifyPublishedLessonContent({
        contentId: content.id,
        courseId: content.courseId,
        contentTitle: content.title,
        contentType: content.type,
        published: content.published,
        actorId: job.uploadedByUserId,
        sourceEvent: "LESSON_ASSET_PUBLISHED",
      });
    }

    // Mark job as READY
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: {
        status: "READY",
        currentStep: "Traitement terminé avec succès !",
        outputVideoPath: videoUpload.data.url,
        outputDuration: finalInfo.duration,
        outputSizeBytes: finalVideoBuffer.length,
        progressPercent: 100,
        completedAt: new Date(),
      },
    });

    console.log(`[branding-service] Video job ${jobId} finished successfully.`);
  } catch (error: any) {
    if (signal?.aborted) {
      console.log(`[branding-service] Job ${jobId} paused for graceful shutdown.`);
      await prisma.videoProcessingJob.updateMany({
        where: { id: jobId, status: { not: "READY" } },
        data: {
          status: "QUEUED",
          currentStep: "En attente de reprise après redémarrage...",
          errorCode: null,
          errorMessage: null,
          failedAt: null,
        },
      });
      await prisma.lessonContent
        .update({ where: { id: job.contentId }, data: { status: "PROCESSING" } })
        .catch(() => null);
      return;
    }
    console.error(`[branding-service] Job ${jobId} failed:`, error);
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        currentStep: "Le traitement a échoué. La vidéo n'a pas été publiée sans son intro.",
        errorCode: isVideoBrandingToolUnavailableError(error) ? "VIDEO_TOOL_UNAVAILABLE" : "FFMPEG_ERROR",
        errorMessage: error.message || String(error),
        failedAt: new Date(),
      },
    });

    await prisma.lessonContent
      .update({
        where: { id: job.contentId },
        data: { status: "FAILED" },
      })
      .catch(() => null);
  } finally {
    // Cleanup temporary files
    try {
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
        console.log(`[branding-service] Cleaned up working directory: ${workDir}`);
      }
    } catch (cleanupError) {
      console.error(`[branding-service] Cleanup failed for ${workDir}:`, cleanupError);
    }
  }
}
