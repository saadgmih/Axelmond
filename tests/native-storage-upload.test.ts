/** @vitest-environment node */
import { describe, expect, it, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import request from "supertest";
import { registerNativeStorageRoutes, getMediaRootDir } from "../src/server/native-storage-routes";
import { deleteCloudFiles } from "../src/uploadthing";
import { signAuthToken } from "../src/auth-token";

vi.mock("../src/db", () => {
  const users: Record<string, any> = {
    "user-prof-1": {
      id: "user-prof-1",
      email: "prof@perfacademy.ma",
      role: "PROFESSOR",
      emailVerified: true,
    },
    "user-student-1": {
      id: "user-student-1",
      email: "student@perfacademy.ma",
      role: "STUDENT",
      emailVerified: true,
    },
  };
  const courses: Record<number, any> = {
    10: {
      id: 10,
      title: "Algèbre 1",
      createdById: "user-prof-1",
    },
  };

  return {
    prisma: {
      user: {
        findUnique: vi.fn().mockImplementation(async ({ where }) => users[where.id] || null),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          users[where.id] = { ...users[where.id], ...data };
          return users[where.id];
        }),
      },
      academicProfile: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      course: {
        findFirst: vi.fn().mockImplementation(async ({ where }) => {
          const c = courses[where.id];
          if (!c) return null;
          if (where.createdById && c.createdById !== where.createdById) return null;
          return c;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          courses[where.id] = { ...courses[where.id], ...data };
          return courses[where.id];
        }),
      },
      contentSection: {
        findFirst: vi.fn().mockResolvedValue({ id: "sec-1", courseId: 10 }),
      },
      lessonContent: {
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: data.id || "content-1",
          courseId: data.courseId,
          title: data.title,
          type: data.type,
          published: data.published,
          attachments: [{ id: "att-1", url: data.attachments.create.url, fileName: data.attachments.create.fileName }],
        })),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      liveSession: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      conversationParticipant: {
        findUnique: vi.fn().mockResolvedValue({ id: "part-1" }),
      },
    },
  };
});

describe("Native Hetzner Storage Upload System", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    registerNativeStorageRoutes(app);
  });

  it("rejects unauthenticated upload requests with 401", async () => {
    const res = await request(app)
      .post("/api/storage/upload?endpoint=avatarImage")
      .attach("files", Buffer.from("fake-image"), "avatar.jpg");

    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Authentification requise");
  });

  it("rejects dangerous file extensions (e.g. .exe, .sh, .svg) with 400", async () => {
    const token = signAuthToken({ id: "user-prof-1", role: "PROFESSOR" });
    const res = await request(app)
      .post("/api/storage/upload?endpoint=avatarImage")
      .set("Authorization", `Bearer ${token}`)
      .attach("files", Buffer.from("malicious"), "danger.sh");

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Type de fichier non autorisé");
  });

  it("successfully uploads avatar image and returns relative /media/avatars URL", async () => {
    const token = signAuthToken({ id: "user-prof-1", role: "PROFESSOR" });
    // Valid PNG signature
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

    const res = await request(app)
      .post("/api/storage/upload?endpoint=avatarImage")
      .set("Authorization", `Bearer ${token}`)
      .attach("files", pngHeader, "profile.png");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].url).toMatch(/^\/media\/avatars\//);
    expect(res.body[0].serverData.url).toMatch(/^\/media\/avatars\//);

    // Verify file exists on local media disk
    const savedPath = path.join(getMediaRootDir(), "avatars", res.body[0].key);
    expect(fs.existsSync(savedPath)).toBe(true);

    // Test deleteCloudFiles deletes this local file
    await deleteCloudFiles(res.body[0].url);
    expect(fs.existsSync(savedPath)).toBe(false);
  });

  it("successfully uploads course image and returns customId and URL", async () => {
    const token = signAuthToken({ id: "user-prof-1", role: "PROFESSOR" });
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

    const res = await request(app)
      .post("/api/storage/upload?endpoint=courseImage")
      .set("Authorization", `Bearer ${token}`)
      .field("input", JSON.stringify({ courseId: 10 }))
      .attach("files", pngHeader, "cover.png");

    expect(res.status).toBe(200);
    expect(res.body[0].url).toMatch(/^\/media\/images\//);
    expect(res.body[0].customId).toBeDefined();

    // Clean up
    const savedPath = path.join(getMediaRootDir(), "images", res.body[0].key);
    if (fs.existsSync(savedPath)) fs.unlinkSync(savedPath);
  });

  it("successfully uploads PDF lesson asset to /media/documents", async () => {
    const token = signAuthToken({ id: "user-prof-1", role: "PROFESSOR" });
    const pdfContent = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");

    const res = await request(app)
      .post("/api/storage/upload?endpoint=lessonAsset")
      .set("Authorization", `Bearer ${token}`)
      .field(
        "input",
        JSON.stringify({
          courseId: 10,
          title: "Chapitre 1",
          contentType: "PDF",
          published: true,
        }),
      )
      .attach("files", pdfContent, "chapitre1.pdf");

    expect(res.status).toBe(200);
    expect(res.body[0].url).toMatch(/^\/media\/documents\//);
    expect(res.body[0].serverData.contentId).toBeDefined();

    // Clean up
    const savedPath = path.join(getMediaRootDir(), "documents", res.body[0].key);
    if (fs.existsSync(savedPath)) fs.unlinkSync(savedPath);
  });
});
