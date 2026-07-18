/** @vitest-environment node */
import { loadEnv } from "../src/load-env";
loadEnv();

import fs from "fs";
import path from "path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => {
  const store: Record<string, any> = {};
  const jobs: Record<string, any> = {};
  const lessons: Record<string, any> = {};
  const attachments: Record<string, any> = {};

  return {
    siteSetting: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => store[where.key] || null),
      create: vi.fn().mockImplementation(async ({ data }) => {
        store[data.key] = { key: data.key, value: data.value };
        return store[data.key];
      }),
      upsert: vi.fn().mockImplementation(async ({ where, update, create }) => {
        store[where.key] = { key: where.key, value: update.value || create.value };
        return store[where.key];
      }),
    },
    course: {
      create: vi.fn().mockResolvedValue({ id: 123, title: "Test Course" }),
      delete: vi.fn().mockResolvedValue({ id: 123 }),
    },
    lessonContent: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        const id = data.id || "lesson-123";
        const lesson = {
          id,
          courseId: data.courseId,
          title: data.title,
          type: data.type,
          published: data.published,
          status: data.status || "READY",
          attachments: [],
        };
        lessons[id] = lesson;
        if (data.attachments && data.attachments.create) {
          const createData = data.attachments.create;
          const attachId = "attach-123";
          attachments[attachId] = {
            id: attachId,
            contentId: id,
            url: createData.url,
            fileKey: createData.fileKey,
            fileName: createData.fileName,
          };
        }
        return lesson;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        const id = where.id;
        const lesson = lessons[id] || { id };
        if (data.status) lesson.status = data.status;
        lessons[id] = lesson;
        return lesson;
      }),
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        const id = where.id;
        const lesson = lessons[id] || {
          id,
          courseId: 123,
          title: "Test Lesson",
          type: "VIDEO",
          published: true,
          status: "PROCESSING",
        };
        const job = Object.values(jobs).find((j) => j.contentId === id);
        const attachList = Object.values(attachments).filter((a) => a.contentId === id);
        return {
          ...lesson,
          attachments: attachList.length > 0 ? attachList : [{ id: "attach-123", url: job?.sourceVideoPath || "https://example.com/initial.mp4", key: "initial-key" }],
        };
      }),
      delete: vi.fn().mockImplementation(async ({ where }) => {
        const lesson = lessons[where.id];
        delete lessons[where.id];
        return lesson;
      }),
    },
    videoProcessingJob: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        const id = "job-123";
        const job = {
          id,
          contentId: data.contentId,
          uploadedByUserId: data.uploadedByUserId,
          sourceVideoPath: data.sourceVideoPath,
          status: data.status || "UPLOADED",
        };
        jobs[id] = job;
        return job;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        const id = where.id;
        const job = jobs[id] || { id };
        if (data.status) job.status = data.status;
        if (data.outputVideoPath) job.outputVideoPath = data.outputVideoPath;
        if (data.outputDuration) job.outputDuration = data.outputDuration;
        if (data.outputSizeBytes) job.outputSizeBytes = data.outputSizeBytes;
        if (data.progressPercent !== undefined) job.progressPercent = data.progressPercent;
        jobs[id] = job;
        return job;
      }),
      updateMany: vi.fn().mockImplementation(async ({ where, data }) => {
        Object.values(jobs).forEach((job) => {
          if (where.status && where.status.in && where.status.in.includes(job.status)) {
            job.status = data.status;
          }
        });
        return { count: 1 };
      }),
      findUnique: vi.fn().mockImplementation(async ({ where }) => jobs[where.id] || null),
      findFirst: vi.fn().mockImplementation(async () => Object.values(jobs)[0] || null),
      delete: vi.fn().mockImplementation(async ({ where }) => {
        const job = jobs[where.id];
        delete jobs[where.id];
        return job;
      }),
    },
    attachment: {
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        const id = where.id;
        const attach = attachments[id] || { id };
        if (data.url) attach.url = data.url;
        if (data.fileKey) attach.fileKey = data.fileKey;
        attachments[id] = attach;
        return attach;
      }),
      deleteMany: vi.fn().mockImplementation(async () => {
        return { count: 1 };
      }),
    },
  };
});

vi.mock("../src/db", () => ({
  prisma: {
    siteSetting: dbMocks.siteSetting,
    course: dbMocks.course,
    lessonContent: dbMocks.lessonContent,
    videoProcessingJob: dbMocks.videoProcessingJob,
    attachment: dbMocks.attachment,
    $transaction: vi.fn().mockImplementation(async (callback) => callback(dbMocks)),
  },
}));

import { prisma } from "../src/db";
import {
  probeVideo,
  runCommand,
  processVideoJob,
} from "../src/services/video-branding-service";
import {
  getBrandingConfig,
  updateBrandingConfig,
} from "../src/services/video-branding-config";
import { startVideoBrandingWorker, stopVideoBrandingWorker } from "../src/services/video-branding-worker";
import { canViewLessonContent } from "../src/server/lesson-document";
import { AppUser } from "../src/server/route-types";

// Mock the UploadThing API client to bypass S3 upload in tests
vi.mock("../src/uploadthing-api", () => ({
  utapi: {
    uploadFiles: vi.fn().mockResolvedValue([
      { data: { url: "https://example.com/mock-video.mp4", key: "mock-video-key" }, error: null },
      { data: { url: "https://example.com/mock-thumb.jpg", key: "mock-thumb-key" }, error: null },
    ]),
    deleteFiles: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock notifyPublishedLessonContent to bypass external notifications
vi.mock("../src/academic-notifications", () => ({
  notifyPublishedLessonContent: vi.fn().mockResolvedValue(undefined),
}));

// Mock syncPublishedLessonModules to bypass curriculum module sync
vi.mock("../src/course-curriculum-sync", () => ({
  syncPublishedLessonModules: vi.fn().mockResolvedValue(undefined),
}));

// Mock fetch globally
vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
  if (url.endsWith(".mp4") && fs.existsSync(url)) {
    const buffer = fs.readFileSync(url);
    return {
      ok: true,
      arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    };
  }
  return {
    ok: true,
    statusText: "OK",
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}));

const TEST_DIR = path.join(process.cwd(), "videos", "test_temp");
const SRC_LANDSCAPE_AUDIO = path.join(TEST_DIR, "src_landscape_audio.mp4");
const SRC_LANDSCAPE_NO_AUDIO = path.join(TEST_DIR, "src_landscape_no_audio.mp4");
const SRC_PORTRAIT_AUDIO = path.join(TEST_DIR, "src_portrait_audio.mp4");

describe("Video Branding Automatic Pipeline", () => {
  beforeAll(async () => {
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // Generate very fast, small test assets (1 second duration)
    // 1. Landscape with audio
    await runCommand("ffmpeg", [
      "-f", "lavfi", "-i", "color=c=blue:s=320x240:d=1",
      "-f", "lavfi", "-i", "anullsrc=cl=stereo:r=44100",
      "-c:v", "libx264", "-t", "1", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
      SRC_LANDSCAPE_AUDIO, "-y",
    ]);

    // 2. Landscape without audio
    await runCommand("ffmpeg", [
      "-f", "lavfi", "-i", "color=c=red:s=320x240:d=1",
      "-c:v", "libx264", "-t", "1", "-pix_fmt", "yuv420p",
      SRC_LANDSCAPE_NO_AUDIO, "-y",
    ]);

    // 3. Portrait with audio
    await runCommand("ffmpeg", [
      "-f", "lavfi", "-i", "color=c=green:s=240x320:d=1",
      "-f", "lavfi", "-i", "anullsrc=cl=stereo:r=44100",
      "-c:v", "libx264", "-t", "1", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
      SRC_PORTRAIT_AUDIO, "-y",
    ]);
  });

  afterAll(() => {
    // Cleanup temporary files
    try {
      if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
      }
    } catch (e) {
      console.error("Cleanup failed:", e);
    }
    vi.restoreAllMocks();
  });

  describe("SiteSetting configuration management", () => {
    it("seeds default configuration if missing and retrieves it", async () => {
      const config = await getBrandingConfig();
      expect(config).toBeDefined();
      expect(config.introAssetId).toBe("default-intro");
      expect(config.introEnabled).toBe(true);
    });

    it("updates configuration settings", async () => {
      const original = await getBrandingConfig();
      await updateBrandingConfig({ introVersion: 99, introEnabled: false });

      const updated = await getBrandingConfig();
      expect(updated.introVersion).toBe(99);
      expect(updated.introEnabled).toBe(false);

      // Restore original config
      await updateBrandingConfig({ introVersion: original.introVersion, introEnabled: original.introEnabled });
    });
  });

  describe("Probing logic with ffprobe", () => {
    it("probes landscape video with audio correctly", async () => {
      const info = await probeVideo(SRC_LANDSCAPE_AUDIO);
      expect(info.width).toBe(320);
      expect(info.height).toBe(240);
      expect(info.hasAudio).toBe(true);
      expect(info.duration).toBeCloseTo(1.0, 0.1);
    });

    it("probes landscape video without audio correctly", async () => {
      const info = await probeVideo(SRC_LANDSCAPE_NO_AUDIO);
      expect(info.width).toBe(320);
      expect(info.height).toBe(240);
      expect(info.hasAudio).toBe(false);
    });

    it("probes portrait video correctly", async () => {
      const info = await probeVideo(SRC_PORTRAIT_AUDIO);
      expect(info.width).toBe(240);
      expect(info.height).toBe(320);
      expect(info.hasAudio).toBe(true);
    });
  });

  describe("End-to-End automatic branding job execution", () => {
    it("runs branding job successfully on video without audio", async () => {
      // 1. Setup mock content and attachment
      const course = await prisma.course.create({
        data: {
          title: "Branding Test Course",
          level: "Intermédiaire",
          credits: 3,
          instructor: "Test Instructor",
          duration: "1h",
          category: "Test",
          iconName: "BookOpen",
          color: "emerald",
          published: true,
        } as any,
      });

      const lesson = await prisma.lessonContent.create({
        data: {
          courseId: course.id,
          type: "VIDEO",
          title: "Leçon sans audio",
          published: true,
          status: "PROCESSING",
          attachments: {
            create: {
              courseId: course.id,
              type: "VIDEO",
              fileName: "silent.mp4",
              fileKey: "initial-key",
              url: SRC_LANDSCAPE_NO_AUDIO, // point to local path for the fetch mock to read
              size: fs.statSync(SRC_LANDSCAPE_NO_AUDIO).size,
            },
          },
        },
      });

      const job = await prisma.videoProcessingJob.create({
        data: {
          contentId: lesson.id,
          uploadedByUserId: "user-1",
          sourceVideoPath: SRC_LANDSCAPE_NO_AUDIO, // mock fetch will download this
          status: "QUEUED",
        },
      });

      // 2. Execute branding job
      await processVideoJob(job.id);

      // 3. Assertions
      const updatedJob = await prisma.videoProcessingJob.findUnique({ where: { id: job.id } });
      expect(updatedJob?.status).toBe("READY");
      expect(updatedJob?.outputVideoPath).toBe("https://example.com/mock-video.mp4");
      expect(updatedJob?.outputDuration).toBeDefined();

      const updatedLesson = await prisma.lessonContent.findUnique({
        where: { id: lesson.id },
        include: { attachments: true },
      });
      expect(updatedLesson?.status).toBe("READY");
      expect(updatedLesson?.attachments[0]?.url).toBe("https://example.com/mock-video.mp4");

      // Cleanup
      await prisma.videoProcessingJob.delete({ where: { id: job.id } });
      await prisma.attachment.deleteMany({ where: { contentId: lesson.id } });
      await prisma.lessonContent.delete({ where: { id: lesson.id } });
      await prisma.course.delete({ where: { id: course.id } });
    });
  });

  describe("Student Access Guards", () => {
    const studentUser: AppUser = {
      id: "student-1",
      email: "student@example.com",
      role: "STUDENT",
      emailVerified: true,
      enrolledCourses: [100],
    } as any;

    const adminUser: AppUser = {
      id: "admin-1",
      email: "admin@example.com",
      role: "ADMIN",
      emailVerified: true,
      enrolledCourses: [],
    } as any;

    it("rejects student access if video is in PROCESSING status", async () => {
      const content = {
        courseId: 100,
        published: true,
        sectionId: null,
        section: null,
        status: "PROCESSING",
      };

      const canView = await canViewLessonContent(studentUser, content);
      expect(canView).toBe(false);
    });

    it("allows student access if video status is READY", async () => {
      const content = {
        courseId: 100,
        published: true,
        sectionId: null,
        section: null,
        status: "READY",
      };

      const canView = await canViewLessonContent(studentUser, content);
      expect(canView).toBe(true);
    });

    it("allows admin access regardless of status", async () => {
      const content = {
        courseId: 100,
        published: true,
        sectionId: null,
        section: null,
        status: "PROCESSING",
      };

      const canView = await canViewLessonContent(adminUser, content);
      expect(canView).toBe(true);
    });
  });

  describe("Worker execution and recovery", () => {
    it("starts and stops the worker cleanly", async () => {
      await startVideoBrandingWorker();
      stopVideoBrandingWorker();
    });
  });
});
