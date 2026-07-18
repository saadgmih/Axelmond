import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { prisma } from "../db";
import { utapi } from "../uploadthing-api";
import { getBrandingConfig, VideoIntroConfig } from "./video-branding-config";
import { syncPublishedLessonModules } from "../course-curriculum-sync";
import { notifyPublishedLessonContent } from "../academic-notifications";

export interface VideoInfo {
  width: number;
  height: number;
  duration: number;
  hasAudio: boolean;
  sizeBytes: number;
}

export function runCommand(executable: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(executable, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`Failed to run ${executable} ${args.join(" ")}: ${err.message}\nStderr: ${stderr}`));
      }
      resolve({ stdout, stderr });
    });
  });
}

export async function probeVideo(filePath: string): Promise<VideoInfo> {
  const { stdout } = await runCommand("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration,size",
    "-show_streams",
    "-of", "json",
    filePath,
  ]);

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
      "-f", "lavfi", "-i", "color=c=black:s=1920x1080:d=5",
      "-f", "lavfi", "-i", "anullsrc=cl=stereo:r=48000",
      "-c:v", "libx264", "-t", "5", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
      landscapePath, "-y"
    ]);
  }

  if (!fs.existsSync(portraitPath)) {
    console.log("[branding-service] Generating default portrait intro...");
    await runCommand("ffmpeg", [
      "-f", "lavfi", "-i", "color=c=black:s=1080x1920:d=5",
      "-f", "lavfi", "-i", "anullsrc=cl=stereo:r=48000",
      "-c:v", "libx264", "-t", "5", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
      portraitPath, "-y"
    ]);
  }
}

export async function processVideoJob(jobId: string): Promise<void> {
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

  try {
    // 1. Download original video if it's a URL
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: { status: "VALIDATING", currentStep: "Téléchargement de la vidéo originale...", startedAt: new Date() },
    });

    console.log(`[branding-service] Downloading source video from ${job.sourceVideoPath}...`);
    const response = await fetch(job.sourceVideoPath);
    if (!response.ok) {
      throw new Error(`Failed to download source video: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(originalPath, buffer);

    // 2. Probing source video
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: { status: "PROBING", currentStep: "Analyse des codecs et dimensions..." },
    });

    const info = await probeVideo(originalPath);
    console.log(`[branding-service] Probed video info:`, info);

    // Validation checks
    if (info.sizeBytes > 2 * 1024 * 1024 * 1024) {
      throw new Error("La taille de la vidéo dépasse la limite autorisée de 2 Go.");
    }
    if (info.duration > 4 * 60 * 60) {
      throw new Error("La durée de la vidéo dépasse la limite autorisée de 4 heures.");
    }

    // Determine landscape vs portrait
    const isLandscape = info.width >= info.height;
    const targetW = isLandscape ? 1920 : 1080;
    const targetH = isLandscape ? 1080 : 1920;

    const rawIntroPath = isLandscape ? config.introFilePathLandscape : config.introFilePathPortrait;
    const introPath = await resolveIntroFile(rawIntroPath, isLandscape ? "intro-landscape.mp4" : "intro-portrait.mp4");

    // 3. Normalizing intro and video
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: { status: "NORMALIZING", currentStep: "Normalisation du format...", sourceDuration: info.duration, sourceSizeBytes: info.sizeBytes },
    });

    // Normalize intro
    console.log(`[branding-service] Normalizing intro to match target resolution ${targetW}x${targetH}...`);
    await runCommand("ffmpeg", [
      "-i", introPath,
      "-vf", `scale=w=${targetW}:h=${targetH}:force_original_aspect_ratio=decrease,pad=w=${targetW}:h=${targetH}:x=(${targetW}-iw)/2:y=(${targetH}-ih)/2:color=black,fps=30`,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
      "-c:a", "aac", "-ar", "48000", "-ac", "2",
      normalizedIntroPath, "-y"
    ]);

    // Normalize user video
    console.log(`[branding-service] Normalizing user video (hasAudio: ${info.hasAudio})...`);
    if (info.hasAudio) {
      await runCommand("ffmpeg", [
        "-i", originalPath,
        "-vf", `scale=w=${targetW}:h=${targetH}:force_original_aspect_ratio=decrease,pad=w=${targetW}:h=${targetH}:x=(${targetW}-iw)/2:y=(${targetH}-ih)/2:color=black,fps=30`,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
        "-c:a", "aac", "-ar", "48000", "-ac", "2",
        normalizedUserPath, "-y"
      ]);
    } else {
      // Add silent audio stream
      await runCommand("ffmpeg", [
        "-i", originalPath,
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-vf", `scale=w=${targetW}:h=${targetH}:force_original_aspect_ratio=decrease,pad=w=${targetW}:h=${targetH}:x=(${targetW}-iw)/2:y=(${targetH}-ih)/2:color=black,fps=30`,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
        "-c:a", "aac", "-shortest",
        normalizedUserPath, "-y"
      ]);
    }

    // 4. Concatenate
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: { status: "ADDING_INTRO", currentStep: "Ajout de l'intro Performance Académique..." },
    });

    const concatListPath = path.join(workDir, "concat.txt");
    fs.writeFileSync(concatListPath, `file 'normalized_intro.mp4'\nfile 'normalized_user.mp4'\n`);

    console.log(`[branding-service] Concatenating intro and user video...`);
    await runCommand("ffmpeg", [
      "-f", "concat",
      "-safe", "0",
      "-i", concatListPath,
      "-c", "copy",
      "-movflags", "+faststart",
      finalOutputPath, "-y"
    ]);

    // 5. Verify processed video
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: { status: "VERIFYING", currentStep: "Vérification de la vidéo finale..." },
    });

    const finalInfo = await probeVideo(finalOutputPath);
    console.log(`[branding-service] Processed video info:`, finalInfo);

    const expectedDuration = config.introDuration + info.duration;
    if (Math.abs(finalInfo.duration - expectedDuration) > 1.5) {
      throw new Error(`La durée de la vidéo finale (${finalInfo.duration}s) ne correspond pas à la durée attendue (${expectedDuration}s).`);
    }

    // 6. Generate thumbnail from the main video content
    const thumbTime = config.introDuration + Math.min(2.0, info.duration / 2);
    console.log(`[branding-service] Generating thumbnail at timestamp ${thumbTime}s...`);
    await runCommand("ffmpeg", [
      "-ss", String(thumbTime),
      "-i", finalOutputPath,
      "-vframes", "1",
      "-q:v", "2",
      thumbnailPath, "-y"
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
    const videoUpload = uploadResults[0];
    const thumbUpload = uploadResults[1];

    if (!videoUpload?.data || !thumbUpload?.data) {
      throw new Error(`Upload to UploadThing failed. Video: ${JSON.stringify(videoUpload?.error)}, Thumb: ${JSON.stringify(thumbUpload?.error)}`);
    }

    console.log(`[branding-service] Final upload complete:`, { videoUrl: videoUpload.data.url, thumbUrl: thumbUpload.data.url });

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
    console.error(`[branding-service] Job ${jobId} failed:`, error);
    await prisma.videoProcessingJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        currentStep: "Le traitement a échoué.",
        errorCode: "FFMPEG_ERROR",
        errorMessage: error.message || String(error),
        failedAt: new Date(),
      },
    });

    await prisma.lessonContent.update({
      where: { id: job.contentId },
      data: { status: "FAILED" },
    }).catch(() => {});
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
